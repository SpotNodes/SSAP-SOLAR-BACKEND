import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authGuard } from '../../core/http/auth.js';
import { validate } from '../../core/http/validate.js';
import { registerDevice, unregisterDevice } from './device.controller.js';
import { registerDeviceSchema } from './device.schema.js';

export const devicesRouter = Router();

// Any authenticated principal (customer today; leaves room for an admin app later) can register
// a device — push delivery is a per-user concern, not a per-role one.
devicesRouter.post('/', authGuard, validate({ body: registerDeviceSchema }), asyncHandler(registerDevice));
devicesRouter.delete('/:token', authGuard, asyncHandler(unregisterDevice));
