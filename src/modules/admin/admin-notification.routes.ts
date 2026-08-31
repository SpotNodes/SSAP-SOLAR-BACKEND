import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { listNotifications } from './admin-notification.controller.js';

export const adminNotificationRouter = Router();

adminNotificationRouter.get('/', validate({ query: paginationQuerySchema }), asyncHandler(listNotifications));
