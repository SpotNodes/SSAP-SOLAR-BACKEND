import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(ErrorCode.ROUTE_NOT_FOUND, `Route ${req.method} ${req.originalUrl} not found.`));
}
