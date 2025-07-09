import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '/home/ubuntu/minecraft-manager/.env' : '.env' });
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/database.db');
const SALT_ROUNDS = 12;

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

export const initDatabase = () => {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN DEFAULT 0,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create mods table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      active BOOLEAN DEFAULT 1,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create server_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS server_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT NOT NULL,
      message TEXT NOT NULL
    )
  `);

  // Create default admin user if no users exist
  createDefaultAdmin();

  console.log('Database initialized successfully');
};

const createDefaultAdmin = async () => {
  try {
    // Check if any users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('No users found, creating default admin account...');
      
      // Create default admin with temporary password
      const defaultPassword = 'admin';
      const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
      
      db.prepare(`
        INSERT INTO users (username, password_hash, must_change_password, is_admin) 
        VALUES (?, ?, ?, ?)
      `).run('admin', passwordHash, 1, 1);
      
      console.log('✅ Default admin account created:');
      console.log('   Username: admin');
      console.log('   Password: admin');
      console.log('   ⚠️  You will be required to change this password on first login');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};



export const checkDatabaseHealth = (): boolean => {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
};
