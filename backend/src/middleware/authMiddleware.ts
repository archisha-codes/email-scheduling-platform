import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // 1. Check HttpOnly cookie
    let token = req.cookies?.token;

    // 2. Check Authorization Bearer header fallback
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: No session token provided' });
      return;
    }

    const decoded = AuthService.verifyJwtToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    logger.warn('Authentication token verification failed:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }
}
