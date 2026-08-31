import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '../auth/roles.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

export function rbac(...allowed: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError(ErrorCode.UNAUTHENTICATED, 'Authentication required.'));
      return;
    }
    if (!allowed.includes(req.auth.role)) {
      next(new AppError(ErrorCode.FORBIDDEN, 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
