import { Router } from 'express';
import { Role } from '../../core/auth/roles.js';
import { authGuard } from '../../core/http/auth.js';
import { rbac } from '../../core/http/rbac.js';
import { adminCategoryRouter } from './admin-category.routes.js';
import { adminEnquiryRouter } from './admin-enquiry.routes.js';
import { adminNotificationRouter } from './admin-notification.routes.js';
import { adminOrderRouter } from './admin-order.routes.js';
import { adminProductRouter } from './admin-product.routes.js';

// Composes admin sub-routers under one guard. admin-auth.routes.ts (login/refresh/logout) is
// mounted separately at /admin/auth and is not gated here — logging in can't require a token.
export const adminRouter = Router();

adminRouter.use(authGuard, rbac(Role.ADMIN));

adminRouter.use('/orders', adminOrderRouter);
adminRouter.use('/products', adminProductRouter);
adminRouter.use('/categories', adminCategoryRouter);
adminRouter.use('/notifications', adminNotificationRouter);
adminRouter.use('/enquiries', adminEnquiryRouter);
