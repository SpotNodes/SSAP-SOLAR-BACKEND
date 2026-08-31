import type { NextFunction, Request, Response } from 'express';
import { container } from '../../container.js';
import type { Role } from '../auth/roles.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { id: string; role: Role };
  }
}

export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(ErrorCode.UNAUTHENTICATED, 'Missing or invalid access token.'));
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = container.tokenService.verifyAccessToken(token);
    req.auth = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}
