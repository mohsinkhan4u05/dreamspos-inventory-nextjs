import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { PaymentMethod } from "@prisma/client"
import { InsufficientStockError, applySale } from "@/lib/stockEngine"

export const dynamic = "force-dynamic"

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales
 *     description: Retrieve a paginated list of sales with filtering options
 *     tags:
 *       - Sales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for invoice number or customer name/email
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, CANCELLED]
 *         description: Filter by sale status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       invoiceNumber:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                         nullable: true
 *                       customerEmail:
 *                         type: string
 *                         nullable: true
 *                       customerPhone:
 *                         type: string
 *                         nullable: true
 *                       subtotal:
 *                         type: number
 *                       discount:
 *                         type: number
 *                       tax:
 *                         type: number
 *                       totalAmount:
 *                         type: number
 *                       paymentMethod:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       status:
 *                         type: string
 *                       store:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             productId:
 *                               type: string
 *                             variantId:
 *                               type: string
 *                               nullable: true
 *                             quantity:
 *                               type: number
 *                             unitPrice:
 *                               type: number
 *                             totalPrice:
 *                               type: number
 *                             discount:
 *                               type: number
 *                             product:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 sku:
 *                                   type: string
 *                             variant:
 *                               type: object
 *                               nullable: true
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 sku:
 *                                   type: string
 *                       _count:
 *                         type: object
 *                         properties:
 *                           items:
 *                             type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *   post:
 *     summary: Create a new sale
 *     description: Create a new sale transaction with items and update stock
 *     tags:
 *       - Sales
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - items
 *             properties:
 *               storeId:
 *                 type: string
 *                 description: Store ID where the sale occurs
 *               customerName:
 *                 type: string
 *                 description: Customer name
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               customerPhone:
 *                 type: string
 *                 description: Customer phone number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     variantId:
 *                       type: string
 *                       description: Product variant ID
 *                     quantity:
 *                       type: number
 *                       description: Quantity sold
 *                     unitPrice:
 *                       type: number
 *                       description: Unit price
 *                     discount:
 *                       type: number
 *                       description: Item discount
 *                     unitId:
 *                       type: string
 *                       description: Unit ID
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CARD, BANK_TRANSFER, OTHER]
 *                 default: CASH
 *                 description: Payment method
 *               paymentStatus:
 *                 type: string
 *                 enum: [PAID, PENDING, PARTIAL]
 *                 default: PAID
 *                 description: Payment status
 *               discount:
 *                 type: number
 *                 description: Total discount amount
 *               tax:
 *                 type: number
 *                 description: Tax amount
 *     responses:
 *       201:
 *         description: Sale created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 invoiceNumber:
 *                   type: string
 *                 storeId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 customerName:
 *                   type: string
 *                   nullable: true
 *                 customerEmail:
 *                   type: string
 *                   nullable: true
 *                 customerPhone:
 *                   type: string
 *                   nullable: true
 *                 subtotal:
 *                   type: number
 *                 discount:
 *                   type: number
 *                 tax:
 *                   type: number
 *                 totalAmount:
 *                   type: number
 *                 paymentMethod:
 *                   type: string
 *                 paymentStatus:
 *                   type: string
 *                 status:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       productId:
 *                         type: string
 *                       variantId:
 *                         type: string
 *                         nullable: true
 *                       quantity:
 *                         type: number
 *                       unitPrice:
 *                         type: number
 *                       totalPrice:
 *                         type: number
 *                       discount:
 *                         type: number
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                       variant:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Store ID and items are required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const storeId = searchParams.get("storeId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const saleId = searchParams.get("saleId")
    const customerId = searchParams.get("customerId")
    const paymentStatus = searchParams.get("paymentStatus")

    const where: Record<string, any> = {}
    
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } }
      ]
    }
    
    if (saleId) {
      where.id = saleId
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (storeId) {
      where.storeId = storeId
    }
    
    if (status) {
      where.status = status
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    // Use saleDate as the primary date for filtering invoices
    if (startDate || endDate) {
      where.saleDate = {}
      if (startDate) {
        where.saleDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.saleDate.lte = new Date(endDate)
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          session: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
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
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where })
    ])

    return NextResponse.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      storeId,
      items,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      discount,
      tax,
      paidAmount,
      paymentMethod,
      paymentStatus,
      notes,
      batchOverrides,
    } = body

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "storeId and items are required" },
        { status: 400 },
      )
    }

    const result = await applySale({
      storeId,
      userId: token.sub as string,
      customerId: customerId ?? null,
      customerName: customerName ?? null,
      customerEmail: customerEmail ?? null,
      customerPhone: customerPhone ?? null,
      discount,
      taxAmount: tax,
      paidAmount,
      notes: notes ?? null,
      paymentMethod: paymentMethod ?? PaymentMethod.CASH,
      paymentStatus: paymentStatus ?? null,
      items: items.map((item: any) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        discount: item.discount,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        unitId: item.unitId ?? null,
      })),
      batchOverrides: Array.isArray(batchOverrides) ? batchOverrides : undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Insufficient stock for sale" },
        { status: 400 },
      )
    }

    console.error("Error creating sale:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
