import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/User';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded as User;
    next();
  });
};

export default authenticateToken;

// Legacy session-based auth for compatibility
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/auth/login') return next();

  if (!req.session || !req.session.user || !req.session.user.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}