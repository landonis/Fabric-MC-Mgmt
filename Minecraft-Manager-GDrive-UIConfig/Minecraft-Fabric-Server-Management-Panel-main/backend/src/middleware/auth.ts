// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/auth/login') return next();

  if (!req.session || !req.session.user || !req.session.user.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
