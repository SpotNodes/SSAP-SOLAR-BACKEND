import rateLimit from 'express-rate-limit';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';

// Per-IP abuse guard, defense-in-depth on top of the per-mobile cooldown/hourly-cap enforced in
// AuthService.requestOtp (which is the accurate business rule — a mobile number isn't tied to IP).
export const otpRequestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.'));
  },
});
