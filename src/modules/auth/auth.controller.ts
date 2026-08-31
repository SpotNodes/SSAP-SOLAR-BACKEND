import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import type {
  LoginBody,
  RefreshTokenBody,
  RegisterBody,
  RequestOtpBody,
  VerifyOtpBody,
} from './auth.schema.js';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { mobile, purpose } = req.body as RequestOtpBody;
  const result = await container.authService.requestOtp(mobile, purpose);
  sendOk(res, result);
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { requestId, mobile, otp } = req.body as VerifyOtpBody;
  const result = await container.authService.verifyOtp(requestId, mobile, otp);
  sendOk(res, result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { mobile, verificationToken } = req.body as LoginBody;
  const result = await container.authService.login(mobile, verificationToken);
  sendOk(res, result);
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterBody;
  const result = await container.authService.register(body);
  sendOk(res, result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshTokenBody;
  const result = await container.authService.refresh(refreshToken);
  sendOk(res, result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as RefreshTokenBody;
  await container.authService.logout(refreshToken);
  res.status(204).end();
}
