import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import { toPublicUser } from './user.mapper.js';
import type { UpdateProfileBody } from './user.schema.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await container.userService.getById(req.auth!.id);
  sendOk(res, toPublicUser(user));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateProfileBody;
  const user = await container.userService.updateProfile(req.auth!.id, body);
  sendOk(res, toPublicUser(user));
}
