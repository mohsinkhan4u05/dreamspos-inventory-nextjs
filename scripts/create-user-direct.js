const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:mohsin123@localhost:5433/dreamspos?schema=public'
});

async function createMockUser() {
  console.log('Creating mock user directly via PostgreSQL...');
  
  try {
    // Check if store exists
    const storeResult = await pool.query(
      'SELECT id FROM stores WHERE code = $1',
      ['DEFAULT']
    );
    
    let storeId;
    if (storeResult.rows.length === 0) {
      // Create store
      const storeInsert = await pool.query(`
        INSERT INTO stores (id, name, code, address, phone, email, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `, ['Default Store', 'DEFAULT', '123 Main Street, City, State', '+1234567890', 'store@dreamspos.com']);
      storeId = storeInsert.rows[0].id;
      console.log('Store created');
    } else {
      storeId = storeResult.rows[0].id;
      console.log('Store already exists');
    }
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@dreamspos.com']
    );
    
    if (userResult.rows.length === 0) {
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create user
      await pool.query(`
        INSERT INTO users (id, email, username, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, ['admin@dreamspos.com', 'admin', hashedPassword, 'Admin', 'User', 'SUPER_ADMIN', true]);
      
      console.log('\n✅ Mock user created successfully!');
      console.log('Email: admin@dreamspos.com');
      console.log('Password: admin123');
      console.log('Role: SUPER_ADMIN');
    } else {
      console.log('User already exists');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createMockUser();
