import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authGuard } from '../../core/http/auth.js';
import { rbac } from '../../core/http/rbac.js';
import { validate } from '../../core/http/validate.js';
import { Role } from '../../core/auth/roles.js';
import { refreshTokenSchema } from '../auth/auth.schema.js';
import { adminLogin, adminLogout, adminRefresh } from './admin-auth.controller.js';
import { adminLoginSchema } from './admin-auth.schema.js';
import { adminLoginRateLimiter } from './admin-login-rate-limit.js';

export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  adminLoginRateLimiter,
  validate({ body: adminLoginSchema }),
  asyncHandler(adminLogin),
);
adminAuthRouter.post('/refresh', validate({ body: refreshTokenSchema }), asyncHandler(adminRefresh));
adminAuthRouter.post(
  '/logout',
  authGuard,
  rbac(Role.ADMIN),
  validate({ body: refreshTokenSchema }),
  asyncHandler(adminLogout),
);
