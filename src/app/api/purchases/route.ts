import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * @swagger
 * /api/purchases:
 *   get:
 *     summary: Get all purchases
 *     description: Retrieve a paginated list of purchases with filtering options
 *     tags:
 *       - Purchases
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
 *         description: Search term for order number, supplier name, or reference number
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, RECEIVED, CANCELLED]
 *         description: Filter by purchase status
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
 *         description: Purchases retrieved successfully
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
 *                       orderNumber:
 *                         type: string
 *                       supplierId:
 *                         type: string
 *                         nullable: true
 *                       subtotal:
 *                         type: number
 *                       discount:
 *                         type: number
 *                       taxAmount:
 *                         type: number
 *                       totalAmount:
 *                         type: number
 *                       paidAmount:
 *                         type: number
 *                       dueAmount:
 *                         type: number
 *                       paymentStatus:
 *                         type: string
 *                       status:
 *                         type: string
 *                       expectedDate:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                       store:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             productId:
 *                               type: string
 *                             quantity:
 *                               type: number
 *                             unitPrice:
 *                               type: number
 *                             totalPrice:
 *                               type: number
 *                             discount:
 *                               type: number
 *                             taxRate:
 *                               type: number
 *                             taxAmount:
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
 *     summary: Create a new purchase
 *     description: Create a new purchase order with items
 *     tags:
 *       - Purchases
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
 *                 description: Store ID for the purchase
 *               supplierId:
 *                 type: string
 *                 description: Supplier ID
 *               supplierName:
 *                 type: string
 *                 description: Supplier name
 *               supplierEmail:
 *                 type: string
 *                 format: email
 *                 description: Supplier email
 *               supplierPhone:
 *                 type: string
 *                 description: Supplier phone number
 *               referenceNumber:
 *                 type: string
 *                 description: Reference number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                     - unitCost
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     quantity:
 *                       type: number
 *                       description: Quantity to purchase
 *                     unitCost:
 *                       type: number
 *                       description: Unit cost
 *                     discount:
 *                       type: number
 *                       description: Item discount
 *                     taxRate:
 *                       type: number
 *                       description: Tax rate
 *                     taxAmount:
 *                       type: number
 *                       description: Tax amount
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CARD, BANK_TRANSFER, CREDIT]
 *                 description: Payment method
 *               paymentStatus:
 *                 type: string
 *                 enum: [PAID, PENDING, PARTIAL]
 *                 default: PENDING
 *                 description: Payment status
 *               discount:
 *                 type: number
 *                 description: Total discount amount
 *               tax:
 *                 type: number
 *                 description: Tax amount
 *               paidAmount:
 *                 type: number
 *                 description: Amount paid
 *               expectedDate:
 *                 type: string
 *                 format: date
 *                 description: Expected delivery date
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Purchase created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 orderNumber:
 *                   type: string
 *                 storeId:
 *                   type: string
 *                 supplierId:
 *                   type: string
 *                   nullable: true
 *                 subtotal:
 *                   type: number
 *                 discount:
 *                   type: number
 *                 taxAmount:
 *                   type: number
 *                 totalAmount:
 *                   type: number
 *                 paidAmount:
 *                   type: number
 *                 dueAmount:
 *                   type: number
 *                 paymentStatus:
 *                   type: string
 *                 status:
 *                   type: string
 *                 expectedDate:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 notes:
 *                   type: string
 *                   nullable: true
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       productId:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       unitPrice:
 *                         type: number
 *                       totalPrice:
 *                         type: number
 *                       discount:
 *                         type: number
 *                       taxRate:
 *                         type: number
 *                       taxAmount:
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

    const where: Record<string, unknown> = {}
    
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { supplierName: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } }
      ]
    }
    
    if (storeId) {
      where.storeId = storeId
    }
    
    if (status) {
      where.status = status
    }
    
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate)
      }
      where.createdAt = dateFilter
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true
                }
              }
            }
          },
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where })
    ])

    return NextResponse.json({
      data: purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching purchases:", error)
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
    const { storeId, supplierName, supplierEmail, supplierPhone, referenceNumber, items, paymentMethod, paymentStatus } = body

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Store ID and items are required" },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = `PUR-${Date.now()}`

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0)
    const discount = body.discount || 0
    const taxAmount = body.tax || 0
    const totalAmount = subtotal - discount + taxAmount
    const paidAmount = body.paidAmount || 0
    const dueAmount = totalAmount - paidAmount

    const result = await prisma.$transaction(async (tx) => {
      // Create purchase
      const purchase = await tx.purchase.create({
        data: {
          orderNumber,
          storeId,
          supplierId: body.supplierId || null,
          subtotal,
          discount,
          taxAmount,
          totalAmount,
          paidAmount,
          dueAmount,
          paymentStatus: paymentStatus || "PENDING",
          status: "PENDING",
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
          notes: body.notes || null,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitCost),
              totalPrice: parseFloat(item.quantity) * parseFloat(item.unitCost),
              discount: item.discount || 0,
              taxRate: item.taxRate || 0,
              taxAmount: item.taxAmount || 0,
            }))
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true
                }
              }
            }
          }
        }
      })

      return purchase
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
