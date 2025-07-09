import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase } from './database/init';
import authRoutes from './routes/auth';
import serverRoutes from './routes/server';
import modRoutes from './routes/mods';
import worldRoutes from './routes/world';
import playerRoutes from './routes/players';

// Load environment variables
dotenv.config({ 
  path: process.env.NODE_ENV === 'production' 
    ? '/home/ubuntu/minecraft-manager/.env' 
    : '.env' 
});

const app = express();
const port = process.env.PORT || 3001;

// Initialize database
try {
  initDatabase();
} catch (err) {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/server', serverRoutes);
app.use('/api/mods', modRoutes);
app.use('/api/world', worldRoutes);
app.use('/api/players', playerRoutes);

// Root test
app.get('/api/health', (_req, res) => {
  const dbOk = checkDatabaseHealth();
  if (dbOk) {
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

app.get('/', (_req, res) => {
  res.json({ 
    message: 'Minecraft Fabric Server Manager API is running',
    version: '1.0.0',
    status: 'healthy'
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
