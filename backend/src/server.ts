import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase, checkDatabaseHealth } from './database/init';
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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-with-a-secure-random-string',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/server', serverRoutes);
app.use('/api/mods', modRoutes);
app.use('/api/world', worldRoutes);
app.use('/api/players', playerRoutes);

// Health check endpoints
app.get('/api/health', (_req, res) => {
  const dbOk = checkDatabaseHealth();
  if (dbOk) {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } else {
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ 
    message: 'Minecraft Fabric Server Manager API is running',
    version: '1.0.0',
    status: 'healthy'
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Backend listening at http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret configured: ${!!process.env.JWT_SECRET}`);
});