const { Pool } = require('pg');

let pool;

const initPool = () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // SSL for production
    max: 10,
    idleTimeoutMillis: 30000,
  });
};

const initDB = async () => {
  try {
    initPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user'
      );
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        allocated_to INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'available'
      );
      -- Pre-seed resources (avoid duplicates)
      INSERT INTO resources (name, status) 
      SELECT 'Conference Room A', 'available' 
      WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = 'Conference Room A');
      INSERT INTO resources (name, status) 
      SELECT 'Laptop Set 1', 'available' 
      WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = 'Laptop Set 1');
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err);
  }
};

module.exports = { pool, initDB };