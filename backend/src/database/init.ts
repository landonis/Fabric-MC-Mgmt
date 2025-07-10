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
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Set secure temp store
  db.pragma('secure_delete = ON');
  
  // Optimize performance
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 1000');
  db.pragma('temp_store = MEMORY');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN DEFAULT 0,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME
    )
  `);

  // Create sessions table for session management
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create audit log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
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
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      uploaded_by INTEGER,
      checksum TEXT,
      FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  // Create server_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS server_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT DEFAULT 'minecraft-server'
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_server_logs_timestamp ON server_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_server_logs_level ON server_logs(level);
  `);

  // Create default admin user if no users exist
  createDefaultAdmin();

  console.log('Database initialized successfully');
};

const createDefaultAdmin = () => {
  try {
    // Check if any users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('No users found, creating default admin account...');
      
      // Create default admin with temporary password
      const defaultPassword = 'admin';
      const passwordHash = bcrypt.hashSync(defaultPassword, SALT_ROUNDS);
      
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
