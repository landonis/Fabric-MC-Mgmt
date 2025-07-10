import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database/init';
import authenticateToken from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { User } from '../types/User';

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateToken = (user: User) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not defined in environment');

  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      must_change_password: user.must_change_password
    },
    secret,
    { expiresIn: '12h' }
  );
};

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username) as User | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Missing password hash' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        mustChangePassword: user.must_change_password === 1,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const dbUser = stmt.get(user.id) as User | undefined;

    if (!dbUser || !dbUser.password_hash) {
      return res.status(401).json({ error: 'User not found or missing password' });
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .run(newPasswordHash, user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/users
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, is_admin as isAdmin FROM users').all();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)'
    ).run(username, passwordHash, isAdmin ? 1 : 0);

    res.json({ 
      id: result.lastInsertRowid, 
      username, 
      isAdmin: !!isAdmin 
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'User creation failed' });
    }
  }
});

export default router;