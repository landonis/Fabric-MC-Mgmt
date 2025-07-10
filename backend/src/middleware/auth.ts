import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/User';
import rateLimit from 'express-rate-limit';

interface AuthenticatedRequest extends Request {
  user?: User;
}

// Rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

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
      console.warn(`JWT verification failed: ${err.message} for IP: ${req.ip}`);
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