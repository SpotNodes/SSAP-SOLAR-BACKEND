import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authGuard } from '../../core/http/auth.js';
import { validate } from '../../core/http/validate.js';
import * as controller from './auth.controller.js';
import { otpRequestRateLimiter } from './otp-rate-limit.js';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from './auth.schema.js';

export const authRouter = Router();

authRouter.post(
  '/otp/request',
  otpRequestRateLimiter,
  validate({ body: requestOtpSchema }),
  asyncHandler(controller.requestOtp),
);
authRouter.post('/otp/verify', validate({ body: verifyOtpSchema }), asyncHandler(controller.verifyOtp));
authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(controller.login));
authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
authRouter.post('/refresh', validate({ body: refreshTokenSchema }), asyncHandler(controller.refresh));
authRouter.post(
  '/logout',
  authGuard,
  validate({ body: refreshTokenSchema }),
  asyncHandler(controller.logout),
);
