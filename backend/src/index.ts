import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
import session from 'express-session';
import { requireAuth } from './middleware/auth';

const app = express();
app.use(cors());
app.use(session({ secret: 'minecraft_secret', resave: false, saveUninitialized: true }));
app.use(requireAuth);
app.use(express.json());

// Routes
import serverRoutes from './routes/server';
import playerRoutes from './routes/players';
app.use('/api/server', serverRoutes);
app.use('/api/players', playerRoutes);

// Serve frontend
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start WebSocket
import './ws/server';

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 API server running on http://localhost:${PORT}`);
});
