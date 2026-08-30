import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

// App-wide baseline. Stricter, endpoint-specific limiters (OTP, admin login) land in Phase 1.
export const baseRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.'));
  },
});
