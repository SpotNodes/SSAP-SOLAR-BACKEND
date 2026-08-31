import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authGuard } from '../../core/http/auth.js';
import { validate } from '../../core/http/validate.js';
import { getMe, updateMe } from './user.controller.js';
import { updateProfileSchema } from './user.schema.js';

export const usersRouter = Router();

usersRouter.get('/me', authGuard, asyncHandler(getMe));
usersRouter.patch('/me', authGuard, validate({ body: updateProfileSchema }), asyncHandler(updateMe));
