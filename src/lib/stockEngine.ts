import { prisma } from "@/lib/prisma"
import {
  MovementSourceType,
  MovementType,
  PaymentMethod,
  PaymentStatus,
  ProductionStatus,
  PurchaseOrderStatus,
  PurchaseStatus,
  ReturnStatus,
  SaleStatus,
  SalesOrderStatus,
} from "@prisma/client"
import {
  logPurchaseBillAccountingEntry,
  logPurchaseReceiveAccountingEntry,
} from "@/lib/accountingEngine"
import type { Prisma } from "@prisma/client"

export class InsufficientStockError extends Error {
  constructor(message = "INSUFFICIENT_STOCK") {
    super(message)
    this.name = "InsufficientStockError"
  }
}

export type CreateStockAdjustmentInput = {
  productId: string
  variantId?: string | null
  storeId: string
  unitId?: string | null
  stockId?: string | null
  quantity: number
  movementType: MovementType
  reference?: string | null
  description?: string | null
}

export async function createStockAdjustment(input: CreateStockAdjustmentInput) {
  const {
    productId,
    variantId,
    storeId,
    unitId,
    stockId,
    quantity,
    movementType,
    reference,
    description,
  } = input

  // This engine function assumes movementType and quantity have been validated
  // by the caller. It focuses on stock math, constraints, and movement
  // persistence.

  return prisma.$transaction(async (tx) => {
    let stock = null as Awaited<ReturnType<typeof tx.stock.findUnique>> | null

    if (stockId) {
      stock = await tx.stock.findUnique({ where: { id: stockId } })
    }

    if (!stock) {
      stock = await tx.stock.findFirst({
        where: {
          productId,
          variantId: variantId ?? null,
          storeId,
        },
      })
    }

    if (!stock) {
      stock = await tx.stock.create({
        data: {
          productId,
          variantId: variantId ?? null,
          storeId,
          warehouseId: null,
          unitId: unitId ?? null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    if (movementType === MovementType.ADJUSTMENT_IN) {
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      })
    } else {
      const updateResult = await tx.stock.updateMany({
        where: {
          id: stock.id,
          quantity: {
            gte: quantity,
          },
        },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      })

      if (updateResult.count === 0) {
        throw new InsufficientStockError()
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        variantId: variantId ?? null,
        storeId,
        warehouseId: stock.warehouseId,
        unitId: unitId ?? null,
        stockId: stock.id,
        movementType,
        quantity,
        reference: reference ?? null,
        description: description ?? null,
        sourceType: MovementSourceType.ADJUSTMENT,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    return movement
  })
}

type AdjustOpeningStockInput = {
  productId: string
  newOpeningStock: number
  previousOpeningStock: number
}

export async function adjustOpeningStock(input: AdjustOpeningStockInput) {
  const { productId, newOpeningStock, previousOpeningStock } = input

  const delta = newOpeningStock - previousOpeningStock

  if (delta === 0) {
    return null
  }

  return prisma.$transaction(async (tx) => {
    // Try to find an existing stock row for this product to anchor the movement
    let stock = await tx.stock.findFirst({
      where: {
        productId,
        variantId: null,
      },
    })

    // If none exists, fall back to any store and create one.
    // If there are no stores yet, skip stock-level adjustment gracefully.
    if (!stock) {
      const store = await tx.store.findFirst()

      if (!store) {
        // No store defined in the system yet – allow opening stock fields
        // to be updated without creating stock rows or movements.
        return null
      }

      stock = await tx.stock.create({
        data: {
          productId,
          variantId: null,
          storeId: store.id,
          warehouseId: null,
          unitId: null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    if (delta > 0) {
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          quantity: {
            increment: delta,
          },
        },
      })
    } else {
      const decrement = Math.abs(delta)

      const updateResult = await tx.stock.updateMany({
        where: {
          id: stock.id,
          quantity: {
            gte: decrement,
          },
        },
        data: {
          quantity: {
            decrement,
          },
        },
      })

      if (updateResult.count === 0) {
        throw new InsufficientStockError()
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        variantId: null,
        storeId: stock.storeId,
        warehouseId: stock.warehouseId,
        unitId: stock.unitId,
        stockId: stock.id,
        movementType: delta > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT,
        quantity: Math.abs(delta),
        reference: null,
        description: "Opening stock adjustment",
        sourceType: MovementSourceType.ADJUSTMENT,
      },
    })

    return movement
  })
}

type ApplyItemStockAdjustmentInput = {
  productId: string
  storeId: string
  userId: string
  adjustmentType: "QUANTITY" | "VALUE"
  quantityAdjusted: number
  costPerUnit?: number | null
  reason?: string | null
  referenceNumber?: string | null
  account?: string | null
  notes?: string | null
  status: "DRAFT" | "FINAL"
  adjustmentDate?: string | Date | null
}

export async function applyItemStockAdjustment(
  input: ApplyItemStockAdjustmentInput,
) {
  const {
    productId,
    storeId,
    userId,
    adjustmentType,
    quantityAdjusted,
    costPerUnit,
    reason,
    referenceNumber,
    account,
    notes,
    status,
    adjustmentDate,
  } = input

  if (!Number.isFinite(quantityAdjusted) || quantityAdjusted === 0) {
    throw new Error("INVALID_ADJUSTMENT_QUANTITY")
  }

  return prisma.$transaction(async (tx) => {
    let stock = await tx.stock.findFirst({
      where: {
        productId,
        variantId: null,
        storeId,
      },
    })

    if (!stock) {
      stock = await tx.stock.create({
        data: {
          productId,
          variantId: null,
          storeId,
          warehouseId: null,
          unitId: null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    const oldQuantity = stock.quantity
    let newQuantity = oldQuantity

    const effectiveAdjustmentDate = adjustmentDate
      ? new Date(adjustmentDate)
      : new Date()

    const baseAdjustmentData = {
      productId,
      storeId,
      adjustmentType,
      quantityAdjusted,
      costPerUnit: costPerUnit ?? null,
      oldQuantity,
      newQuantity: oldQuantity,
      reason: reason ?? null,
      referenceNumber: referenceNumber ?? null,
      account: account ?? null,
      notes: notes ?? null,
      status,
      createdBy: userId,
      adjustmentDate: effectiveAdjustmentDate,
    }

    const anyTx = tx as any

    // Drafts and VALUE adjustments do not touch inventory; just persist the adjustment row.
    if (status === "DRAFT" || adjustmentType === "VALUE") {
      const adjustment = await anyTx.stockAdjustment.create({
        data: baseAdjustmentData,
      })

      return { adjustment, movements: [], layers: [] as unknown[] }
    }

    // FINAL + QUANTITY adjustment: apply inventory changes with FIFO layers
    newQuantity = oldQuantity + quantityAdjusted
    if (newQuantity < 0) {
      throw new InsufficientStockError()
    }

    await anyTx.stock.update({
      where: { id: stock.id },
      data: { quantity: newQuantity },
    })

    const movements: any[] = []
    const layersTouched: any[] = []

    if (quantityAdjusted > 0) {
      // Positive adjustment: create a new FIFO stock layer and an ADJUSTMENT_IN movement
      const layer = await anyTx.stockLayer.create({
        data: {
          productId,
          variantId: stock.variantId,
          storeId,
          warehouseId: stock.warehouseId,
          quantity: quantityAdjusted,
          quantityUsed: 0,
          unitCost: costPerUnit ?? 0,
          sourceType: MovementSourceType.ADJUSTMENT,
        },
      })
      layersTouched.push(layer)

      const movement = await anyTx.stockMovement.create({
        data: {
          productId,
          variantId: stock.variantId,
          storeId,
          warehouseId: stock.warehouseId,
          unitId: stock.unitId,
          stockId: stock.id,
          stockLayerId: layer.id,
          movementType: MovementType.ADJUSTMENT_IN,
          quantity: quantityAdjusted,
          unitCost: costPerUnit ?? 0,
          totalCost: (costPerUnit ?? 0) * quantityAdjusted,
          sourceType: MovementSourceType.ADJUSTMENT,
        },
      })
      movements.push(movement)
    } else {
      // Negative adjustment: consume layers FIFO, creating ADJUSTMENT_OUT movements per layer
      let remaining = Math.abs(quantityAdjusted)
      const layers = await anyTx.stockLayer.findMany({
        where: {
          productId,
          storeId,
          warehouseId: stock.warehouseId,
        },
        orderBy: { createdAt: "asc" },
      })

      for (const layer of layers) {
        if (remaining <= 0) break
        const available = layer.quantity - layer.quantityUsed
        if (available <= 0) continue

        const useQty = Math.min(available, remaining)
        const updatedLayer = await anyTx.stockLayer.update({
          where: { id: layer.id },
          data: {
            quantityUsed: {
              increment: useQty,
            },
          },
        })
        layersTouched.push(updatedLayer)
        remaining -= useQty

        const movement = await anyTx.stockMovement.create({
          data: {
            productId,
            variantId: stock.variantId,
            storeId,
            warehouseId: stock.warehouseId,
            unitId: stock.unitId,
            stockId: stock.id,
            stockLayerId: layer.id,
            movementType: MovementType.ADJUSTMENT_OUT,
            quantity: useQty,
            unitCost: layer.unitCost,
            totalCost: layer.unitCost * useQty,
            sourceType: MovementSourceType.ADJUSTMENT,
          },
        })
        movements.push(movement)
      }

      if (remaining > 0) {
        // Not enough layers to fully cover the adjustment; record a non-costed movement
        const movement = await anyTx.stockMovement.create({
          data: {
            productId,
            variantId: stock.variantId,
            storeId,
            warehouseId: stock.warehouseId,
            unitId: stock.unitId,
            stockId: stock.id,
            stockLayerId: null,
            movementType: MovementType.ADJUSTMENT_OUT,
            quantity: remaining,
            unitCost: null,
            totalCost: null,
            sourceType: MovementSourceType.ADJUSTMENT,
          },
        })
        movements.push(movement)
      }
    }

    const adjustment = await anyTx.stockAdjustment.create({
      data: {
        ...baseAdjustmentData,
        newQuantity,
      },
    })

    if (movements.length > 0) {
      await anyTx.stockMovement.updateMany({
        where: {
          id: {
            in: movements.map((m) => m.id),
          },
        },
        data: {
          sourceId: adjustment.id,
        },
      })
    }

    return { adjustment, movements, layers: layersTouched }
  })
}

type PurchaseItemInput = {
  productId: string
  quantity: number
  unitCost: number
  discount?: number
  taxRate?: number
  taxAmount?: number
}

export type ApplyPurchaseReceiveItemInput = {
  productId: string
  quantity: number
  unitCost: number
  totalPrice: number
  sourceId: string
  sourceItemId?: string
}

export type ApplyPurchaseReceiveInput = {
  storeId: string
  reference: string
  items: ApplyPurchaseReceiveItemInput[]
  sourceType?: MovementSourceType
  descriptionPrefix?: string
}

export async function applyPurchaseReceive(
  tx: Prisma.TransactionClient,
  input: ApplyPurchaseReceiveInput,
) {
  const { storeId, reference, items, sourceType, descriptionPrefix } = input

  for (const item of items) {
    let stock = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        variantId: null,
        storeId,
      },
    })

    if (!stock) {
      stock = await tx.stock.create({
        data: {
          productId: item.productId,
          variantId: null,
          storeId,
          warehouseId: null,
          unitId: null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    const newQuantity = stock.quantity + item.quantity

    await tx.stock.update({
      where: { id: stock.id },
      data: { quantity: newQuantity },
    })

    const layer = await tx.stockLayer.create({
      data: {
        productId: item.productId,
        variantId: null,
        storeId,
        warehouseId: stock.warehouseId,
        quantity: item.quantity,
        quantityUsed: 0,
        unitCost: item.unitCost,
        sourceType: sourceType ?? MovementSourceType.PURCHASE,
        sourceId: item.sourceId,
      },
    })

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        variantId: null,
        storeId,
        warehouseId: stock.warehouseId,
        unitId: stock.unitId,
        stockId: stock.id,
        stockLayerId: layer.id,
        movementType: MovementType.PURCHASE,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalPrice,
        reference,
        description: `${descriptionPrefix ?? "Purchase"} ${reference}`,
        sourceType: sourceType ?? MovementSourceType.PURCHASE,
        sourceId: item.sourceId,
        sourceItemId: item.sourceItemId ?? null,
      },
    })
  }
}

export type ApplyPurchaseInput = {
  storeId: string
  supplierId?: string | null
  discount?: number
  tax?: number
  paidAmount?: number
  expectedDate?: string | Date | null
  notes?: string | null
  paymentStatus?: PaymentStatus | null
  items: PurchaseItemInput[]
}

export async function applyPurchase(input: ApplyPurchaseInput) {
  const {
    storeId,
    supplierId,
    discount,
    tax,
    paidAmount,
    expectedDate,
    notes,
    paymentStatus,
    items,
  } = input

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  )
  const discountValue = discount ?? 0
  const taxAmount = tax ?? 0
  const totalAmount = subtotal - discountValue + taxAmount
  const paid = paidAmount ?? 0
  const dueAmount = totalAmount - paid

  const orderNumber = `PUR-${Date.now()}`

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        orderNumber,
        storeId,
        supplierId: supplierId ?? null,
        subtotal,
        discount: discountValue,
        taxAmount,
        totalAmount,
        paidAmount: paid,
        dueAmount,
        paymentStatus: paymentStatus ?? PaymentStatus.PENDING,
        // Since we are immediately updating stock, treat this as RECEIVED
        status: PurchaseStatus.RECEIVED,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitCost,
            totalPrice: item.quantity * item.unitCost,
            discount: item.discount ?? 0,
            taxRate: item.taxRate ?? 0,
            taxAmount: item.taxAmount ?? 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    await applyPurchaseReceive(tx, {
      storeId,
      reference: orderNumber,
      descriptionPrefix: "Purchase",
      items: purchase.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitPrice,
        totalPrice: item.totalPrice,
        sourceId: purchase.id,
        sourceItemId: item.id,
      })),
    })

    await logPurchaseReceiveAccountingEntry(tx, {
      storeId,
      amount: totalAmount,
      purchaseReceiveId: null,
      purchaseOrderId: null,
      purchaseId: purchase.id,
      narration: `Inventory received for purchase ${orderNumber}`,
    })

    await logPurchaseBillAccountingEntry(tx, {
      storeId,
      amount: totalAmount,
      purchaseId: purchase.id,
      purchaseOrderId: null,
      narration: `Bill ${orderNumber} recorded`,
    })

    return purchase
  })
}

type SaleItemInput = {
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  taxAmount?: number
  unitId?: string | null
}

export type ApplySaleInput = {
  storeId: string
  userId: string
  customerId?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  discount?: number
  taxAmount?: number
  paidAmount?: number
  notes?: string | null
  paymentMethod?: PaymentMethod | null
  paymentStatus?: PaymentStatus | null
  salesOrderId?: string | null
  items: SaleItemInput[]
}

export async function applySale(input: ApplySaleInput) {
  const {
    storeId,
    userId,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    discount,
    taxAmount,
    paidAmount,
    notes,
    paymentMethod,
    paymentStatus,
    salesOrderId,
    items,
  } = input

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )
  const discountValue = discount ?? 0
  const taxValue = taxAmount ?? 0
  const totalAmount = subtotal - discountValue + taxValue
  const paid = paidAmount ?? 0
  const dueAmount = totalAmount - paid

  let effectivePaymentStatus: PaymentStatus
  if (paymentStatus) {
    effectivePaymentStatus = paymentStatus
  } else if (paid >= totalAmount && totalAmount > 0) {
    effectivePaymentStatus = PaymentStatus.PAID
  } else if (paid > 0) {
    effectivePaymentStatus = PaymentStatus.PARTIAL
  } else {
    effectivePaymentStatus = PaymentStatus.PENDING
  }

  const invoiceNumber = `INV-${Date.now()}`

  return prisma.$transaction(async (tx) => {
    // Find or create an active POS session for this user and store
    let session = await tx.pOSSession.findFirst({
      where: {
        userId,
        storeId,
        isActive: true,
      },
      orderBy: { openingDate: "desc" },
    })

    if (!session) {
      session = await tx.pOSSession.create({
        data: {
          userId,
          storeId,
          openingCash: 0,
          isActive: true,
          notes: "Auto-created session for sale",
        },
      })
    }

    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        storeId,
        sessionId: session.id,
        customerId: customerId ?? null,
        customerName: customerName ?? null,
        customerEmail: customerEmail ?? null,
        customerPhone: customerPhone ?? null,
        salesOrderId: salesOrderId ?? null,
        subtotal,
        discount: discountValue,
        taxAmount: taxValue,
        totalAmount,
        paidAmount: paid,
        dueAmount,
        paymentStatus: effectivePaymentStatus,
        status: SaleStatus.COMPLETED,
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            discount: item.discount ?? 0,
            taxRate: item.taxRate ?? 0,
            taxAmount: item.taxAmount ?? 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    // Create a payment record when there is a paid amount
    if (paid > 0) {
      await tx.payment.create({
        data: {
          saleId: sale.id,
          sessionId: session.id,
          amount: paid,
          paymentMethod: paymentMethod ?? PaymentMethod.CASH,
          status: effectivePaymentStatus,
          reference: invoiceNumber,
        },
      })
    }

    if (customerId) {
      await tx.customerActivityLog.create({
        data: {
          customerId,
          type: "INVOICE_CREATED",
          title: `Invoice ${invoiceNumber} created`,
          description: `Invoice ${invoiceNumber} for amount ${totalAmount.toFixed(2)}`,
          entityType: "SALE",
          entityId: sale.id,
        },
      })

      if (paid > 0) {
        await tx.customerActivityLog.create({
          data: {
            customerId,
            type: "PAYMENT_RECEIVED",
            title: "Payment received",
            description: `Payment of ${paid.toFixed(2)} received for invoice ${invoiceNumber}`,
            entityType: "PAYMENT",
            entityId: sale.id,
          },
        })
      }
    }

    if (effectivePaymentStatus === PaymentStatus.PAID && !sale.stockDeducted) {
      await applyFifoCostForSale(tx, sale)
    }

    return sale
  })
}

export async function applyFifoCostForSale(
  tx: Prisma.TransactionClient,
  sale: {
    id: string
    storeId: string
    invoiceNumber: string
    stockDeducted: boolean
    items: {
      id: string
      productId: string
      variantId: string | null
      quantity: number
    }[]
  },
) {
  if (sale.stockDeducted) {
    return
  }

  for (const item of sale.items) {
    let stock = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        variantId: item.variantId ?? null,
        storeId: sale.storeId,
      },
    })

    if (!stock) {
      stock = await tx.stock.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId: sale.storeId,
          warehouseId: null,
          unitId: null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    const stockUpdate = await tx.stock.updateMany({
      where: {
        id: stock.id,
        quantity: {
          gte: item.quantity,
        },
      },
      data: {
        quantity: {
          decrement: item.quantity,
        },
      },
    })

    if (stockUpdate.count === 0) {
      throw new InsufficientStockError()
    }

    let remaining = item.quantity

    const layers = await tx.stockLayer.findMany({
      where: {
        productId: item.productId,
        variantId: item.variantId ?? null,
        storeId: sale.storeId,
      },
      orderBy: { createdAt: "asc" },
    })

    let totalCost = 0
    let totalQty = 0

    for (const layer of layers) {
      if (remaining <= 0) break
      const available = layer.quantity - layer.quantityUsed
      if (available <= 0) continue

      const useQty = Math.min(available, remaining)

      await tx.stockLayer.update({
        where: { id: layer.id },
        data: {
          quantityUsed: {
            increment: useQty,
          },
        },
      })

      remaining -= useQty
      totalQty += useQty
      totalCost += useQty * layer.unitCost
    }

    if (remaining > 0) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      })

      const fallbackCost = product?.costPrice ?? 0
      totalCost += remaining * fallbackCost
      totalQty += remaining
      remaining = 0
    }

    const avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0

    const existingMovement = await tx.stockMovement.findFirst({
      where: {
        sourceType: MovementSourceType.SALE,
        sourceId: sale.id,
        sourceItemId: item.id,
      },
    })

    if (existingMovement) {
      await tx.stockMovement.update({
        where: { id: existingMovement.id },
        data: {
          unitCost: avgUnitCost,
          totalCost: avgUnitCost * existingMovement.quantity,
        },
      })
    } else if (totalQty > 0) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId: sale.storeId,
          warehouseId: stock.warehouseId,
          unitId: stock.unitId,
          stockId: stock.id,
          movementType: MovementType.SALE,
          quantity: totalQty,
          unitCost: avgUnitCost,
          totalCost: avgUnitCost * totalQty,
          reference: sale.invoiceNumber,
          description: `Sale ${sale.invoiceNumber}`,
          sourceType: MovementSourceType.SALE,
          sourceId: sale.id,
          sourceItemId: item.id,
        },
      })
    }
  }

  await tx.sale.update({
    where: { id: sale.id },
    data: {
      stockDeducted: true,
    },
  })
}

export type ShipmentFifoItemInput = {
  id: string
  productId: string
  variantId: string | null
  quantity: number
}

export type ApplyShipmentFifoInput = {
  id: string
  storeId: string
  shipmentNumber: string
  items: ShipmentFifoItemInput[]
}

export async function applyFifoForShipment(
  tx: Prisma.TransactionClient,
  shipment: ApplyShipmentFifoInput,
) {
  for (const item of shipment.items) {
    let stock = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        variantId: item.variantId ?? null,
        storeId: shipment.storeId,
      },
    })

    if (!stock) {
      stock = await tx.stock.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId: shipment.storeId,
          warehouseId: null,
          unitId: null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    const stockUpdate = await tx.stock.updateMany({
      where: {
        id: stock.id,
        quantity: {
          gte: item.quantity,
        },
      },
      data: {
        quantity: {
          decrement: item.quantity,
        },
      },
    })

    if (stockUpdate.count === 0) {
      throw new InsufficientStockError()
    }

    let remaining = item.quantity

    const layers = await tx.stockLayer.findMany({
      where: {
        productId: item.productId,
        variantId: item.variantId ?? null,
        storeId: shipment.storeId,
      },
      orderBy: { createdAt: "asc" },
    })

    let totalCost = 0
    let totalQty = 0

    for (const layer of layers) {
      if (remaining <= 0) break
      const available = layer.quantity - layer.quantityUsed
      if (available <= 0) continue

      const useQty = Math.min(available, remaining)

      await tx.stockLayer.update({
        where: { id: layer.id },
        data: {
          quantityUsed: {
            increment: useQty,
          },
        },
      })

      remaining -= useQty
      totalQty += useQty
      totalCost += useQty * layer.unitCost
    }

    if (remaining > 0) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      })

      const fallbackCost = product?.costPrice ?? 0
      totalCost += remaining * fallbackCost
      totalQty += remaining
      remaining = 0
    }

    const avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0

    if (totalQty > 0) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId: shipment.storeId,
          warehouseId: stock.warehouseId,
          unitId: stock.unitId,
          stockId: stock.id,
          movementType: MovementType.SHIPMENT,
          quantity: totalQty,
          unitCost: avgUnitCost,
          totalCost: avgUnitCost * totalQty,
          reference: shipment.shipmentNumber,
          description: `Shipment ${shipment.shipmentNumber}`,
          sourceType: MovementSourceType.SHIPMENT,
          sourceId: shipment.id,
          sourceItemId: item.id,
        },
      })
    }
  }
}

// Manufacturing: complete a production order using FIFO raw material consumption
// and create finished goods stock/output movements.
export async function completeProductionOrder(
  input: { productionOrderId: string; userId: string },
) {
  const { productionOrderId } = input

  return prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: {
        finishedProduct: true,
        store: true,
      },
    })

    if (!order) {
      throw new Error("PRODUCTION_ORDER_NOT_FOUND")
    }

    if (order.status === ProductionStatus.COMPLETED) {
      throw new Error("PRODUCTION_ORDER_ALREADY_COMPLETED")
    }

    if (order.status === ProductionStatus.CANCELLED) {
      throw new Error("PRODUCTION_ORDER_CANCELLED")
    }

    const bomItems = await tx.billOfMaterial.findMany({
      where: { finishedProductId: order.finishedProductId },
      include: {
        rawMaterial: true,
      },
    })

    if (bomItems.length === 0) {
      throw new Error("BOM_NOT_DEFINED_FOR_PRODUCT")
    }

    const storeId = order.storeId

    type RawConsumptionResult = {
      rawMaterialId: string
      quantityRequired: number
      quantityConsumed: number
      totalCost: number
    }

    const consumptionResults: RawConsumptionResult[] = []

    // 1) Consume each raw material according to BOM using FIFO
    for (const bom of bomItems) {
      const requiredQty = bom.quantityRequired * order.quantityPlanned

      if (requiredQty <= 0) {
        continue
      }

      let stock = await tx.stock.findFirst({
        where: {
          productId: bom.rawMaterialId,
          variantId: null,
          storeId,
        },
      })

      if (!stock) {
        throw new InsufficientStockError(
          `INSUFFICIENT_STOCK_RAW_MATERIAL_${bom.rawMaterialId}`,
        )
      }

      const stockUpdate = await tx.stock.updateMany({
        where: {
          id: stock.id,
          quantity: {
            gte: requiredQty,
          },
        },
        data: {
          quantity: {
            decrement: requiredQty,
          },
        },
      })

      if (stockUpdate.count === 0) {
        throw new InsufficientStockError(
          `INSUFFICIENT_STOCK_RAW_MATERIAL_${bom.rawMaterialId}`,
        )
      }

      let remaining = requiredQty

      const layers = await tx.stockLayer.findMany({
        where: {
          productId: bom.rawMaterialId,
          variantId: null,
          storeId,
        },
        orderBy: { createdAt: "asc" },
      })

      let totalCost = 0
      let totalQty = 0

      for (const layer of layers) {
        if (remaining <= 0) break
        const available = layer.quantity - layer.quantityUsed
        if (available <= 0) continue

        const useQty = Math.min(available, remaining)

        await tx.stockLayer.update({
          where: { id: layer.id },
          data: {
            quantityUsed: {
              increment: useQty,
            },
          },
        })

        remaining -= useQty
        totalQty += useQty
        totalCost += useQty * layer.unitCost
      }

      if (remaining > 0) {
        const product = await tx.product.findUnique({
          where: { id: bom.rawMaterialId },
        })

        const fallbackCost = product?.costPrice ?? 0
        totalCost += remaining * fallbackCost
        totalQty += remaining
        remaining = 0
      }

      const avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0

      await tx.productionConsumption.create({
        data: {
          productionOrderId: order.id,
          rawMaterialId: bom.rawMaterialId,
          quantityUsed: requiredQty,
        },
      })

      await tx.stockMovement.create({
        data: {
          productId: bom.rawMaterialId,
          variantId: null,
          storeId,
          warehouseId: stock.warehouseId,
          unitId: stock.unitId,
          stockId: stock.id,
          movementType: MovementType.PRODUCTION_CONSUMPTION,
          quantity: requiredQty,
          unitCost: avgUnitCost,
          totalCost: avgUnitCost * requiredQty,
          reference: order.id,
          description: `Production consumption for order ${order.id}`,
          sourceType: MovementSourceType.PRODUCTION,
          sourceId: order.id,
        },
      })

      consumptionResults.push({
        rawMaterialId: bom.rawMaterialId,
        quantityRequired: requiredQty,
        quantityConsumed: requiredQty,
        totalCost,
      })
    }

    // 2) Create finished goods stock layer and PRODUCTION_OUTPUT movement
    const totalRawCost = consumptionResults.reduce(
      (sum, c) => sum + c.totalCost,
      0,
    )

    const quantityProduced = order.quantityPlanned

    let finishedStock = await tx.stock.findFirst({
      where: {
        productId: order.finishedProductId,
        variantId: null,
        storeId,
      },
    })

    if (!finishedStock) {
      finishedStock = await tx.stock.create({
        data: {
          productId: order.finishedProductId,
          variantId: null,
          storeId,
          warehouseId: null,
          unitId: null,
          quantity: 0,
          minStock: 0,
          maxStock: null,
        },
      })
    }

    const newFinishedQty = finishedStock.quantity + quantityProduced

    await tx.stock.update({
      where: { id: finishedStock.id },
      data: { quantity: newFinishedQty },
    })

    const finishedUnitCost =
      quantityProduced > 0 ? totalRawCost / quantityProduced : 0

    const finishedLayer = await tx.stockLayer.create({
      data: {
        productId: order.finishedProductId,
        variantId: null,
        storeId,
        warehouseId: finishedStock.warehouseId,
        quantity: quantityProduced,
        quantityUsed: 0,
        unitCost: finishedUnitCost,
        sourceType: MovementSourceType.PRODUCTION,
        sourceId: order.id,
      },
    })

    await tx.stockMovement.create({
      data: {
        productId: order.finishedProductId,
        variantId: null,
        storeId,
        warehouseId: finishedStock.warehouseId,
        unitId: finishedStock.unitId,
        stockId: finishedStock.id,
        stockLayerId: finishedLayer.id,
        movementType: MovementType.PRODUCTION_OUTPUT,
        quantity: quantityProduced,
        unitCost: finishedUnitCost,
        totalCost: finishedUnitCost * quantityProduced,
        reference: order.id,
        description: `Production output for order ${order.id}`,
        sourceType: MovementSourceType.PRODUCTION,
        sourceId: order.id,
      },
    })

    const updatedOrder = await tx.productionOrder.update({
      where: { id: order.id },
      data: {
        status: ProductionStatus.COMPLETED,
        quantityProduced,
        completedAt: new Date(),
      },
      include: {
        finishedProduct: true,
        store: true,
        consumptions: true,
      },
    })

    return updatedOrder
  })
}

type SalesReturnItemInput = {
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  taxAmount?: number
}

export type ApplySalesReturnInput = {
  saleId: string
  reason?: string | null
  notes?: string | null
  items?: SalesReturnItemInput[]
}

export async function applySalesReturn(input: ApplySalesReturnInput) {
  const { saleId, reason, notes } = input

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      items: true,
    },
  })

  if (!sale) {
    throw new Error("SALE_NOT_FOUND")
  }

  const resolvedItems: SalesReturnItemInput[] =
    input.items && input.items.length > 0
      ? input.items
      : sale.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))

  const subtotal = resolvedItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )
  const discountTotal = resolvedItems.reduce(
    (sum, item) => sum + (item.discount ?? 0),
    0,
  )
  const taxAmount = resolvedItems.reduce(
    (sum, item) => sum + (item.taxAmount ?? 0),
    0,
  )
  const totalAmount = subtotal - discountTotal + taxAmount

  const returnNumber = `SRN-${Date.now()}`

  return prisma.$transaction(async (tx) => {
    const salesReturn = await tx.salesReturn.create({
      data: {
        saleId,
        returnNumber,
        reason: reason ?? null,
        subtotal,
        discount: discountTotal,
        taxAmount,
        totalAmount,
        status: ReturnStatus.COMPLETED,
        notes: notes ?? null,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        sale: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    // Adjust original sale payments and create a refund payment
    const originalSale = salesReturn.sale
    const newPaidAmount = Math.max(0, originalSale.paidAmount - totalAmount)
    const newDueAmount = originalSale.totalAmount - newPaidAmount

    let newPaymentStatus = originalSale.paymentStatus
    if (newPaidAmount === 0) {
      newPaymentStatus = PaymentStatus.PENDING
    } else if (newPaidAmount < originalSale.totalAmount) {
      newPaymentStatus = PaymentStatus.PARTIAL
    } else {
      newPaymentStatus = PaymentStatus.PAID
    }

    await tx.sale.update({
      where: { id: originalSale.id },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        paymentStatus: newPaymentStatus,
      },
    })

    await tx.payment.create({
      data: {
        saleId: originalSale.id,
        sessionId: originalSale.sessionId,
        amount: -totalAmount,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.REFUNDED,
        reference: returnNumber,
        notes: `Refund for sales return ${returnNumber}`,
      },
    })

    // Increment stock and create RETURN_IN movements
    const storeId = salesReturn.sale.storeId

    for (const item of salesReturn.items) {
      let stock = await tx.stock.findFirst({
        where: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId,
        },
      })

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? null,
            storeId,
            warehouseId: null,
            unitId: null,
            quantity: 0,
            minStock: 0,
            maxStock: null,
          },
        })
      }

      const newQuantity = stock.quantity + item.quantity

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantity: newQuantity },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId,
          warehouseId: stock.warehouseId,
          unitId: stock.unitId,
          stockId: stock.id,
          movementType: MovementType.RETURN_IN,
          quantity: item.quantity,
          unitCost: null,
          totalCost: null,
          reference: returnNumber,
          description: `Sales return ${returnNumber}`,
          sourceType: MovementSourceType.SALES_RETURN,
          sourceId: salesReturn.id,
          sourceItemId: item.id,
        },
      })
    }

    return salesReturn
  })
}

type PurchaseReturnItemInput = {
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  taxAmount?: number
}

export type ApplyPurchaseReturnInput = {
  purchaseId: string
  reason?: string | null
  notes?: string | null
  items: PurchaseReturnItemInput[]
}

export async function applyPurchaseReturn(input: ApplyPurchaseReturnInput) {
  const { purchaseId, reason, notes, items } = input

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
  })

  if (!purchase) {
    throw new Error("PURCHASE_NOT_FOUND")
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  )
  const discountTotal = items.reduce(
    (sum, item) => sum + (item.discount ?? 0),
    0,
  )
  const taxAmount = items.reduce(
    (sum, item) => sum + (item.taxAmount ?? 0),
    0,
  )
  const totalAmount = subtotal - discountTotal + taxAmount

  const returnNumber = `PRN-${Date.now()}`

  return prisma.$transaction(async (tx) => {
    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        purchaseId,
        returnNumber,
        reason: reason ?? null,
        subtotal,
        discount: discountTotal,
        taxAmount,
        totalAmount,
        status: ReturnStatus.COMPLETED,
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        purchase: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    const storeId = purchaseReturn.purchase.storeId

    for (const item of purchaseReturn.items) {
      let stock = await tx.stock.findFirst({
        where: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId,
        },
      })

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? null,
            storeId,
            warehouseId: null,
            unitId: null,
            quantity: 0,
            minStock: 0,
            maxStock: null,
          },
        })
      }

      const updateResult = await tx.stock.updateMany({
        where: {
          id: stock.id,
          quantity: {
            gte: item.quantity,
          },
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      })

      if (updateResult.count === 0) {
        throw new InsufficientStockError()
      }

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          storeId,
          warehouseId: stock.warehouseId,
          unitId: stock.unitId,
          stockId: stock.id,
          movementType: MovementType.RETURN_OUT,
          quantity: item.quantity,
          unitCost: null,
          totalCost: null,
          reference: returnNumber,
          description: `Purchase return ${returnNumber}`,
          sourceType: MovementSourceType.PURCHASE_RETURN,
          sourceId: purchaseReturn.id,
          sourceItemId: item.id,
        },
      })
    }

    return purchaseReturn
  })
}
