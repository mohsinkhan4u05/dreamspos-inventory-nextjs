import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create default store
  const store = await prisma.store.upsert({
    where: { code: 'DEFAULT' },
    update: {},
    create: {
      name: 'Default Store',
      code: 'DEFAULT',
      address: '123 Main Street, City, State',
      phone: '+1234567890',
      email: 'store@dreamspos.com',
    },
  })

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dreamspos.com' },
    update: {},
    create: {
      email: 'admin@dreamspos.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
    },
  })

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'cat-electronics' },
      update: {},
      create: {
        id: 'cat-electronics',
        name: 'Electronics',
        description: 'Electronic devices and accessories',
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-groceries' },
      update: {},
      create: {
        id: 'cat-groceries',
        name: 'Groceries',
        description: 'Food and household items',
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-clothing' },
      update: {},
      create: {
        id: 'cat-clothing',
        name: 'Clothing',
        description: 'Apparel and accessories',
      },
    }),
  ])

  // Create brands
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { id: 'brand-apple' },
      update: {},
      create: {
        id: 'brand-apple',
        name: 'Apple',
        description: 'Apple products',
      },
    }),
    prisma.brand.upsert({
      where: { id: 'brand-samsung' },
      update: {},
      create: {
        id: 'brand-samsung',
        name: 'Samsung',
        description: 'Samsung products',
      },
    }),
  ])

  // Create units
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { code: 'PCS' },
      update: {},
      create: {
        name: 'Pieces',
        code: 'PCS',
        description: 'Individual pieces',
      },
    }),
    prisma.unit.upsert({
      where: { code: 'KG' },
      update: {},
      create: {
        name: 'Kilograms',
        code: 'KG',
        description: 'Weight in kilograms',
      },
    }),
    prisma.unit.upsert({
      where: { code: 'LTR' },
      update: {},
      create: {
        name: 'Liters',
        code: 'LTR',
        description: 'Volume in liters',
      },
    }),
  ])

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'IPHONE15' },
      update: {},
      create: {
        name: 'iPhone 15',
        description: 'Latest iPhone model',
        sku: 'IPHONE15',
        barcode: '1234567890123',
        categoryId: categories[0].id,
        brandId: brands[0].id,
        storeId: store.id,
        costPrice: 799.99,
        sellingPrice: 999.99,
        minPrice: 899.99,
        reorderLevel: 10,
        reorderQty: 20,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SAMSUNG-TV' },
      update: {},
      create: {
        name: 'Samsung 55" Smart TV',
        description: '4K Smart TV',
        sku: 'SAMSUNG-TV',
        barcode: '1234567890124',
        categoryId: categories[0].id,
        brandId: brands[1].id,
        storeId: store.id,
        costPrice: 599.99,
        sellingPrice: 799.99,
        minPrice: 699.99,
        reorderLevel: 5,
        reorderQty: 10,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'RICE-BAG' },
      update: {},
      create: {
        name: 'Premium Rice 5kg',
        description: 'High quality rice',
        sku: 'RICE-BAG',
        barcode: '1234567890125',
        categoryId: categories[1].id,
        storeId: store.id,
        costPrice: 15.99,
        sellingPrice: 19.99,
        minPrice: 17.99,
        reorderLevel: 20,
        reorderQty: 50,
      },
    }),
  ])

  // Create product units
  await Promise.all([
    prisma.productUnit.upsert({
      where: { productId_unitId: { productId: products[0].id, unitId: units[0].id } },
      update: {},
      create: {
        productId: products[0].id,
        unitId: units[0].id,
        isDefault: true,
      },
    }),
    prisma.productUnit.upsert({
      where: { productId_unitId: { productId: products[1].id, unitId: units[0].id } },
      update: {},
      create: {
        productId: products[1].id,
        unitId: units[0].id,
        isDefault: true,
      },
    }),
    prisma.productUnit.upsert({
      where: { productId_unitId: { productId: products[2].id, unitId: units[1].id } },
      update: {},
      create: {
        productId: products[2].id,
        unitId: units[1].id,
        isDefault: true,
      },
    }),
  ])

  // Create initial stock
  await Promise.all([
    prisma.stock.upsert({
      where: { productId_variantId_storeId: { productId: products[0].id, variantId: '', storeId: store.id } },
      update: { quantity: 50 },
      create: {
        productId: products[0].id,
        storeId: store.id,
        unitId: units[0].id,
        quantity: 50,
        minStock: 10,
      },
    }),
    prisma.stock.upsert({
      where: { productId_variantId_storeId: { productId: products[1].id, variantId: '', storeId: store.id } },
      update: { quantity: 15 },
      create: {
        productId: products[1].id,
        storeId: store.id,
        unitId: units[0].id,
        quantity: 15,
        minStock: 5,
      },
    }),
    prisma.stock.upsert({
      where: { productId_variantId_storeId: { productId: products[2].id, variantId: '', storeId: store.id } },
      update: { quantity: 100 },
      create: {
        productId: products[2].id,
        storeId: store.id,
        unitId: units[1].id,
        quantity: 100,
        minStock: 20,
      },
    }),
  ])

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
