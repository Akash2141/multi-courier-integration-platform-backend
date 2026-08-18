import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../errors';
import { JwtUserPayload } from '../types/auth.types';
import { setRequestContextValue } from '../logger/async-context';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token is missing. Format: Bearer <token>');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtUserPayload;
    req.user = decoded;
    setRequestContextValue('userId', decoded.userId);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Authentication token has expired. Please log in again.');
    }
    throw new UnauthorizedError('Invalid authentication token');
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtUserPayload;
    req.user = decoded;
    setRequestContextValue('userId', decoded.userId);
  } catch {
    // Ignore invalid token on optional auth
  }

  next();
};
