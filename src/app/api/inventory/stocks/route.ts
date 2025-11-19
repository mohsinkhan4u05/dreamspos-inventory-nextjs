import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * @swagger
 * /api/inventory/stocks:
 *   get:
 *     summary: Get all stock entries
 *     description: Retrieve a paginated list of stock entries with filtering options
 *     tags:
 *       - Inventory
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
 *         description: Search term for product name, SKU, or barcode
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter for low stock items
 *     responses:
 *       200:
 *         description: Stock entries retrieved successfully
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
 *                       productId:
 *                         type: string
 *                       variantId:
 *                         type: string
 *                         nullable: true
 *                       storeId:
 *                         type: string
 *                       unitId:
 *                         type: string
 *                         nullable: true
 *                       quantity:
 *                         type: number
 *                       minStock:
 *                         type: number
 *                       maxStock:
 *                         type: number
 *                         nullable: true
 *                       batchNumber:
 *                         type: string
 *                         nullable: true
 *                       expiryDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           barcode:
 *                             type: string
 *                           sellingPrice:
 *                             type: number
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
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
 *                       store:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                       unit:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                       updatedAt:
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
 *     summary: Create a new stock entry
 *     description: Create a new stock entry for a product in a store
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - storeId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               variantId:
 *                 type: string
 *                 description: Product variant ID
 *               storeId:
 *                 type: string
 *                 description: Store ID
 *               unitId:
 *                 type: string
 *                 description: Unit ID
 *               quantity:
 *                 type: number
 *                 description: Stock quantity
 *               minStock:
 *                 type: number
 *                 description: Minimum stock level
 *               maxStock:
 *                 type: number
 *                 description: Maximum stock level
 *               batchNumber:
 *                 type: string
 *                 description: Batch number
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Expiry date
 *     responses:
 *       201:
 *         description: Stock entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 productId:
 *                   type: string
 *                 variantId:
 *                   type: string
 *                   nullable: true
 *                 storeId:
 *                   type: string
 *                 unitId:
 *                   type: string
 *                   nullable: true
 *                 quantity:
 *                   type: number
 *                 minStock:
 *                   type: number
 *                 maxStock:
 *                   type: number
 *                   nullable: true
 *                 batchNumber:
 *                   type: string
 *                   nullable: true
 *                 expiryDate:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     sku:
 *                       type: string
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                 unit:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Product ID, store ID, and quantity are required"
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
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const storeId = searchParams.get("storeId")
    const warehouseId = searchParams.get("warehouseId")
    const lowStock = searchParams.get("lowStock") === "true"

    const where: Record<string, unknown> = {}
    
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } }
        ]
      }
    }
    
    if (storeId) {
      where.storeId = storeId
    }

    if (warehouseId) {
      ;(where as Record<string, unknown>)["warehouseId"] = warehouseId
    }
    
    if (lowStock) {
      where.quantity = { lte: prisma.stock.fields.minStock }
    }

    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              sellingPrice: true,
              category: {
                select: { id: true, name: true }
              }
            }
          },
          variant: {
            select: {
              id: true,
              name: true,
              sku: true
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true,
            }
          },
          unit: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stock.count({ where })
    ])

    return NextResponse.json({
      data: stocks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching stocks:", error)
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
    const { productId, variantId, storeId, warehouseId, unitId, quantity, minStock, maxStock, batchNumber, expiryDate } = body

    if (!productId || !storeId || quantity === undefined) {
      return NextResponse.json(
        { error: "Product ID, store ID, and quantity are required" },
        { status: 400 }
      )
    }

    const stock = await prisma.stock.create({
      data: {
        productId,
        variantId: variantId || null,
        storeId,
        warehouseId: warehouseId || null,
        unitId: unitId || null,
        quantity: parseFloat(quantity),
        minStock: parseFloat(minStock) || 0,
        maxStock: maxStock ? parseFloat(maxStock) : null,
        batchNumber: batchNumber || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        },
        unit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    return NextResponse.json(stock, { status: 201 })
  } catch (error) {
    console.error("Error creating stock:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
