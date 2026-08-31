import rateLimit from 'express-rate-limit';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';

// Public, unauthenticated form — per-IP abuse guard against lead-form spam.
export const enquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.'));
  },
});
