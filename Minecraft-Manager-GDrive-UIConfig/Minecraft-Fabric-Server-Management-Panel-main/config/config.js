// Centralized Configuration Management
// This file contains all configurable settings for the Minecraft Server Manager

const path = require('path');
const os = require('os');

// Default configuration values
const DEFAULT_CONFIG = {
  // Application Settings
  app: {
    name: 'Minecraft Server Manager',
    version: '1.0.0',
    port: 3001,
    environment: process.env.NODE_ENV || 'production'
  },

  // Domain and SSL Configuration
  domain: {
    name: process.env.DOMAIN || 'localhost',
    useSSL: process.env.USE_SSL === 'true' || false,
    adminEmail: process.env.ADMIN_EMAIL || 'admin@localhost'
  },

  // System Paths
  paths: {
    app: process.env.APP_DIR || '/home/ubuntu/minecraft-manager',
    minecraft: process.env.MINECRAFT_PATH || '/home/ubuntu/Minecraft',
    world: process.env.WORLD_PATH || '/home/ubuntu/Minecraft/world',
    mods: process.env.MODS_PATH || '/home/ubuntu/Minecraft/mods',
    data: process.env.DATA_DIR || '/home/ubuntu/minecraft-data',
    logs: process.env.LOG_DIR || '/var/log/minecraft-manager',
    backups: process.env.BACKUP_DIR || '/home/ubuntu/minecraft-backups',
    temp: process.env.TEMP_PATH || '/tmp/minecraft-imports'
  },

  // Database Configuration
  database: {
    path: process.env.DB_PATH || '/home/ubuntu/minecraft-data/data/database.db',
    backupRetention: 30 // days
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || null, // Must be set in production
    jwtExpiration: '12h',
    bcryptRounds: 12,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 5 // attempts per window
  },

  // Minecraft Server Configuration
  minecraft: {
    version: '1.20.1',
    fabricVersion: '0.15.3',
    javaArgs: '-Xmx2G -Xms1G',
    port: 25565,
    maxPlayers: 20,
    difficulty: 'normal',
    gamemode: 'survival',
    motd: 'Minecraft Server managed by Fabric Server Manager'
  },

  // Fabric Mod Integration
  fabricMod: {
    port: process.env.FABRIC_MOD_PORT || 8080,
    timeout: 5000,
    enabled: process.env.FABRIC_MOD_ENABLED === 'true' || false
  },

  // File Upload Limits
  uploads: {
    maxModSize: 100 * 1024 * 1024, // 100MB
    maxWorldSize: 500 * 1024 * 1024, // 500MB
    allowedModExtensions: ['.jar'],
    allowedWorldExtensions: ['.tar']
  },

  // Backup Configuration
  backup: {
    retention: 7, // Keep 7 backups
    schedule: '0 2 * * *', // Daily at 2 AM
    compression: true
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: 30,
    maxSize: '10m'
  },

  // System Users
  users: {
    minecraft: 'minecraft',
    manager: 'minecraft-manager'
  }
};

// Environment-specific overrides
const ENVIRONMENT_CONFIGS = {
  development: {
    paths: {
      app: path.join(process.cwd()),
      minecraft: path.join(process.cwd(), 'minecraft'),
      world: path.join(process.cwd(), 'minecraft', 'world'),
      mods: path.join(process.cwd(), 'minecraft', 'mods'),
      data: path.join(process.cwd(), 'data'),
      logs: path.join(process.cwd(), 'logs'),
      backups: path.join(process.cwd(), 'backups'),
      temp: path.join(os.tmpdir(), 'minecraft-imports')
    },
    database: {
      path: path.join(process.cwd(), 'data', 'database.db')
    }
  },

  production: {
    // Production settings are in DEFAULT_CONFIG
  }
};

// Merge configurations
function mergeConfig(base, override) {
  const result = { ...base };
  
  for (const key in override) {
    if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = mergeConfig(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  
  return result;
}

// Get final configuration
const environment = process.env.NODE_ENV || 'production';
const envConfig = ENVIRONMENT_CONFIGS[environment] || {};
const config = mergeConfig(DEFAULT_CONFIG, envConfig);

// Validation
function validateConfig() {
  const errors = [];

  // Required fields
  if (!config.security.jwtSecret && environment === 'production') {
    errors.push('JWT_SECRET is required in production');
  }

  if (config.domain.useSSL && !config.domain.adminEmail.includes('@')) {
    errors.push('Valid admin email is required for SSL setup');
  }

  if (errors.length > 0) {
    throw new Error('Configuration validation failed:\n' + errors.join('\n'));
  }
}

// Export configuration
module.exports = {
  ...config,
  validate: validateConfig,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production'
};