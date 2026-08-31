import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import type { RefreshTokenBody } from '../auth/auth.schema.js';
import type { AdminLoginBody } from './admin-auth.schema.js';

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as AdminLoginBody;
  const result = await container.adminAuthService.login(email, password);
  sendOk(res, result);
}

export async function adminRefresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshTokenBody;
  const result = await container.adminAuthService.refresh(refreshToken);
  sendOk(res, result);
}

export async function adminLogout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshTokenBody;
  await container.adminAuthService.logout(refreshToken);
  res.status(204).end();
}
