import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { buildVariantCreateManyInputs, generateVariantCombos } from "@/lib/products/variantGenerator"

export const dynamic = "force-dynamic"

/**
 * @swagger
 * /api/inventory/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve detailed information about a specific product
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
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
 *                 sellingPrice:
 *                   type: number
 *                 costPrice:
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
 *                     code:
 *                       type: string
 *                 variants:
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
 *                       price:
 *                         type: number
 *                       stocks:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             quantity:
 *                               type: number
 *                 units:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       unit:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                 stocks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       quantity:
 *                         type: number
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
 *                 gstRates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       gstRate:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           rate:
 *                             type: number
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
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Product not found"
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
 *   put:
 *     summary: Update product
 *     description: Update a product's information
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
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
 *               sellingPrice:
 *                 type: number
 *                 description: Selling price
 *               costPrice:
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
 *       200:
 *         description: Product updated successfully
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
 *                 sellingPrice:
 *                   type: number
 *                 costPrice:
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
 *                     code:
 *                       type: string
 *                 variants:
 *                   type: array
 *                   items:
 *                     type: object
 *                 units:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       unit:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
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
 *   delete:
 *     summary: Delete product
 *     description: Soft delete a product by setting isActive to false
 *     tags:
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        unit: true,
        preferredVendor: true,
        createdBy: true,
        variants: {
          include: {
            stocks: true,
          },
        },
        units: {
          include: {
            unit: true,
          },
        },
        stocks: {
          include: {
            unit: true,
          },
        },
        gstRates: {
          include: {
            gstRate: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Product Detail Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = await context.params

    const {
      isVariant,
      variantOptions,
      baseSkuPrefix,
      variantUpdates,
      ...updateData
    } = body || {}

    let optionInputs: { name: string; values: string[]; position: number }[] = []
    let combos: ReturnType<typeof generateVariantCombos> = []

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
      }
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(updateData as any),
          ...(typeof isVariant === "boolean" ? { isVariant } : {}),
        },
      })

      const canGenerateVariants =
        Boolean(isVariant) &&
        optionInputs.length > 0 &&
        combos.length > 0 &&
        existing.variants.length === 0

      if (canGenerateVariants) {
        for (const option of optionInputs) {
          const createdOption = await tx.productOption.create({
            data: {
              productId: id,
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
          id,
          (baseSkuPrefix ?? (updateData as any)?.sku ?? existing.sku ?? null) as string | null,
          combos,
        )

        if (variantRows.length > 0) {
          await tx.productVariant.createMany({
            data: variantRows,
          })
        }
      }

      // Handle variant updates (edit prices / quantities, add simple new variants)
      if (Array.isArray(variantUpdates) && variantUpdates.length > 0) {
        // Determine a default store for stock rows
        let defaultStoreId: string | null = (token as any)?.storeId ?? null
        if (!defaultStoreId) {
          const firstStore = await tx.store.findFirst({ select: { id: true } })
          defaultStoreId = firstStore?.id ?? null
        }

        for (const v of variantUpdates as any[]) {
          const variantId = v.id as string | undefined
          const name = typeof v.name === "string" ? v.name.trim() : null
          const costPrice =
            v.costPrice !== undefined && v.costPrice !== null
              ? Number(v.costPrice)
              : null
          const sellingPrice =
            v.sellingPrice !== undefined && v.sellingPrice !== null
              ? Number(v.sellingPrice)
              : null
          const quantity =
            v.quantity !== undefined && v.quantity !== null
              ? Number(v.quantity)
              : null

          if (!variantId && !name) {
            continue
          }

          // Existing variant: update prices and stock quantity
          if (variantId) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: {
                ...(name ? { name } : {}),
                costPrice,
                sellingPrice,
              },
            })

            if (quantity !== null && Number.isFinite(quantity)) {
              const existingStock = await tx.stock.findFirst({
                where: {
                  productId: id,
                  variantId,
                },
              })

              if (existingStock) {
                await tx.stock.update({
                  where: { id: existingStock.id },
                  data: { quantity },
                })
              } else if (defaultStoreId && quantity > 0) {
                await tx.stock.create({
                  data: {
                    productId: id,
                    variantId,
                    storeId: defaultStoreId,
                    warehouseId: null,
                    unitId: null,
                    quantity,
                    minStock: 0,
                    maxStock: null,
                    batchNumber: null,
                    expiryDate: null,
                  },
                })
              }
            }

            continue
          }

          // New simple variant: create ProductVariant and a Stock row
          if (!name) continue

          const createdVariant = await tx.productVariant.create({
            data: {
              productId: id,
              name,
              sku: null,
              costPrice,
              sellingPrice,
              isActive: true,
            },
          })

          if (
            defaultStoreId &&
            quantity !== null &&
            Number.isFinite(quantity) &&
            quantity > 0
          ) {
            await tx.stock.create({
              data: {
                productId: id,
                variantId: createdVariant.id,
                storeId: defaultStoreId,
                warehouseId: null,
                unitId: null,
                quantity,
                minStock: 0,
                maxStock: null,
                batchNumber: null,
                expiryDate: null,
              },
            })
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          brand: true,
          unit: true,
          preferredVendor: true,
          createdBy: true,
          variants: {
            include: {
              stocks: true,
            },
          },
          units: {
            include: {
              unit: true,
            },
          },
        },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Update Product Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Delete Product Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
