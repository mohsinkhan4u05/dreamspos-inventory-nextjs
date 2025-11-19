import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createMockUser() {
  console.log('Creating mock user...')
  
  try {
    // Create default store first
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
    console.log('Store created:', store.name)

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
    console.log('Admin user created:', adminUser.email)

    console.log('\n✅ Mock user created successfully!')
    console.log('Email: admin@dreamspos.com')
    console.log('Password: admin123')
    console.log('Role: SUPER_ADMIN')
    
  } catch (error) {
    console.error('Error creating mock user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMockUser()
