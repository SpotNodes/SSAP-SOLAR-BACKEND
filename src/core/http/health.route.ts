import { Router } from 'express';
import { sendOk } from '../response/envelope.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  sendOk(res, { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
