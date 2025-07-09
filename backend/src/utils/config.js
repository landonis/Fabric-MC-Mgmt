// Configuration utility for backend
const config = require('../../config/config.js');

// Validate configuration on startup
try {
  config.validate();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = config;