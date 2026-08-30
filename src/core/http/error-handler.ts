import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { ErrorCode, ERROR_STATUS } from '../errors/error-codes.js';
import { logger } from '../logger/logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const requestId = req.id;

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err, requestId }, err.message);
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, requestId, timestamp },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
    res.status(ERROR_STATUS.VALIDATION_ERROR).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed.',
        details,
        requestId,
        timestamp,
      },
    });
    return;
  }

  logger.error({ err, requestId }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong. Please try again.',
      requestId,
      timestamp,
    },
  });
}
