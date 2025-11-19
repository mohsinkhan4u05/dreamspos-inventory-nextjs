import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-static'

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test database connection
 *     description: Test the database connection and retrieve sample data
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Database test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Database connection successful"
 *                 counts:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: integer
 *                     categories:
 *                       type: integer
 *                     brands:
 *                       type: integer
 *                 sampleProducts:
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
 *       500:
 *         description: Database test failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Get product count
    const productCount = await prisma.product.count()
    const categoryCount = await prisma.category.count()
    const brandCount = await prisma.brand.count()
    
    // Get first few products
    const products = await prisma.product.findMany({
      take: 5,
      include: {
        category: true,
        brand: true,
      }
    })
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      counts: {
        products: productCount,
        categories: categoryCount,
        brands: brandCount
      },
      sampleProducts: products
    })
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
