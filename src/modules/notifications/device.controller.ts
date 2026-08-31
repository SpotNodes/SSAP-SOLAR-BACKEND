import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import type { RegisterDeviceBody } from './device.schema.js';

export async function registerDevice(req: Request, res: Response): Promise<void> {
  const { expoPushToken, platform } = req.body as RegisterDeviceBody;
  const device = await container.deviceService.register(req.auth!.id, expoPushToken, platform);
  sendOk(res, device, 201);
}

export async function unregisterDevice(req: Request, res: Response): Promise<void> {
  await container.deviceService.unregister(req.auth!.id, req.params.token as string);
  res.status(204).end();
}
