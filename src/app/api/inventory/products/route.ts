import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { buildVariantCreateManyInputs, generateVariantCombos } from "@/lib/products/variantGenerator"

export const dynamic = "force-dynamic"

/**
 * @swagger
 * /api/inventory/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a paginated list of products with filtering options
 *     tags:
 *       - Inventory
 *       - Products
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name, SKU, or barcode
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       sku:
 *                         type: string
 *                       barcode:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: number
 *                       cost:
 *                         type: number
 *                       isActive:
 *                         type: boolean
 *                       category:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       brand:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       store:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       variants:
 *                         type: array
 *                         items:
 *                           type: object
 *                       units:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             unit:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                       stocks:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             store:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                             unit:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
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
 *     summary: Create a new product
 *     description: Create a new product with all associated data
 *     tags:
 *       - Inventory
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *               barcode:
 *                 type: string
 *                 description: Product barcode
 *               description:
 *                 type: string
 *                 description: Product description
 *               price:
 *                 type: number
 *                 description: Selling price
 *               cost:
 *                 type: number
 *                 description: Cost price
 *               categoryId:
 *                 type: string
 *                 description: Category ID
 *               brandId:
 *                 type: string
 *                 description: Brand ID
 *               storeId:
 *                 type: string
 *                 description: Store ID
 *               isActive:
 *                 type: boolean
 *                 description: Product active status
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 sku:
 *                   type: string
 *                 barcode:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: number
 *                 cost:
 *                   type: number
 *                 isActive:
 *                   type: boolean
 *                 category:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                 brand:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
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
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
          { barcode: { contains: search, mode: "insensitive" as const } }
        ]
      })
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          unit: true,
          preferredVendor: true,
          createdBy: true,
          variants: true,
          units: {
            include: {
              unit: true
            }
          },
          stocks: {
            include: {
              unit: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Products API Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const {
      isVariant,
      variantOptions,
      baseSkuPrefix,
      variantDetails,
      unitId,
      ...productData
    } = body || {}

    let optionInputs: { name: string; values: string[]; position: number }[] = []
    let combos: ReturnType<typeof generateVariantCombos> = []
    const variantDetailMap = new Map<string, { costPrice: number; sellingPrice: number; quantity: number }>()

    if (isVariant && Array.isArray(variantOptions)) {
      optionInputs = (variantOptions as any[])
        .map((opt, index) => ({
          name: String(opt?.name ?? "").trim(),
          values: Array.isArray(opt?.values) ? opt.values.map((v: any) => String(v)) : [],
          position: typeof opt?.position === "number" ? opt.position : index,
        }))
        .filter((opt) => opt.name && opt.values.length > 0)

      if (optionInputs.length > 0) {
        try {
          combos = generateVariantCombos(optionInputs)
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Invalid variant options" },
            { status: 400 },
          )
        }

        if (!Array.isArray(variantDetails) || variantDetails.length === 0) {
          return NextResponse.json(
            { error: "Variant cost price, selling price and quantity are required for all variants" },
            { status: 400 },
          )
        }

        for (const detail of variantDetails as any[]) {
          const title = String(detail?.title ?? "").trim()
          const cost = Number(detail?.costPrice)
          const sell = Number(detail?.sellingPrice)
          const qty = Number(detail?.quantity)

          if (!title || Number.isNaN(cost) || Number.isNaN(sell) || Number.isNaN(qty)) {
            return NextResponse.json(
              { error: "Each variant must have a title, cost price, selling price and quantity" },
              { status: 400 },
            )
          }

          variantDetailMap.set(title, {
            costPrice: cost,
            sellingPrice: sell,
            quantity: qty,
          })
        }

        for (const combo of combos) {
          if (!variantDetailMap.has(combo.title)) {
            return NextResponse.json(
              { error: `Missing pricing or quantity for variant \"${combo.title}\"` },
              { status: 400 },
            )
          }
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...(productData as any),
          ...(typeof isVariant === "boolean" ? { isVariant } : {}),
          ...(unitId ? { unit: { connect: { id: String(unitId) } } } : {}),
          createdByUserId: token.sub || undefined,
        },
      })

      if (!isVariant || optionInputs.length === 0 || combos.length === 0) {
        return tx.product.findUnique({
          where: { id: created.id },
          include: {
            brand: true,
            unit: true,
            preferredVendor: true,
            createdBy: true,
            variants: true,
            units: {
              include: {
                unit: true,
              },
            },
          },
        })
      }

      for (const option of optionInputs) {
        const createdOption = await tx.productOption.create({
          data: {
            productId: created.id,
            name: option.name,
            position: option.position,
          },
        })

        for (const value of option.values) {
          await tx.productOptionValue.create({
            data: {
              optionId: createdOption.id,
              value,
            },
          })
        }
      }

      const variantRows = buildVariantCreateManyInputs(
        created.id,
        (baseSkuPrefix ?? (productData as any)?.sku ?? null) as string | null,
        combos,
        variantDetailMap,
      )

      let createdVariants: { id: string; name: string }[] = []

      if (variantRows.length > 0) {
        const manyResult = await tx.productVariant.createMany({
          data: variantRows,
        })

        if (manyResult.count > 0) {
          createdVariants = await tx.productVariant.findMany({
            where: { productId: created.id },
            select: { id: true, name: true },
          })
        }
      }

      if (createdVariants.length > 0 && variantDetailMap.size > 0) {
        const stockInserts: any[] = []
        const batchInserts: any[] = []

        let defaultStoreId: string | null = (token as any)?.storeId ?? null

        // Fallback: if the user/session does not have a storeId, use the first store
        if (!defaultStoreId) {
          const firstStore = await tx.store.findFirst({
            select: { id: true },
          })
          defaultStoreId = firstStore?.id ?? null
        }
        const defaultUnitId = unitId ? String(unitId) : null

        for (const variant of createdVariants) {
          const detail = variantDetailMap.get(variant.name)
          if (!detail) continue

          if (detail.quantity <= 0) {
            continue
          }

          batchInserts.push({
            productId: created.id,
            variantId: variant.id,
            batchNumber: `${created.id}-${variant.id}-OPENING`,
            manufacturingDate: null,
            expiryDate: null,
            unitCost: detail.costPrice,
            openingQuantity: detail.quantity,
            availableQuantity: detail.quantity,
            reservedQuantity: 0,
            status: "ACTIVE",
            sourceType: "OPENING_STOCK",
            referenceId: null,
          })

          if (defaultStoreId) {
            stockInserts.push({
              productId: created.id,
              variantId: variant.id,
              storeId: defaultStoreId,
              warehouseId: null,
              unitId: defaultUnitId,
              quantity: detail.quantity,
              minStock: 0,
              maxStock: null,
              batchNumber: null,
              expiryDate: null,
            })
          }
        }

        if (batchInserts.length > 0) {
          await tx.itemBatch.createMany({ data: batchInserts })
        }

        if (stockInserts.length > 0) {
          await tx.stock.createMany({ data: stockInserts })
        }
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: {
          brand: true,
          unit: true,
          preferredVendor: true,
          createdBy: true,
          variants: true,
          units: {
            include: {
              unit: true,
            },
          },
        },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Create Product Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
