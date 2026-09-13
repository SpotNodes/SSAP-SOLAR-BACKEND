import { Router } from 'express';
import { Role } from '../../core/auth/roles.js';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authGuard } from '../../core/http/auth.js';
import { rbac } from '../../core/http/rbac.js';
import { validate } from '../../core/http/validate.js';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './user-notification.controller.js';

export const userNotificationsRouter = Router();

// CUSTOMER-only: this is the customer's own inbox. Admins read the shared feed
// at /admin/notifications, which is a different collection entirely.
userNotificationsRouter.use(authGuard, rbac(Role.CUSTOMER));

userNotificationsRouter.get('/', validate({ query: paginationQuerySchema }), asyncHandler(listNotifications));
userNotificationsRouter.get('/unread-count', asyncHandler(getUnreadCount));
userNotificationsRouter.post('/read-all', asyncHandler(markAllNotificationsRead));
// Declared after /unread-count and /read-all so those literals win over :id.
userNotificationsRouter.post('/:id/read', asyncHandler(markNotificationRead));
