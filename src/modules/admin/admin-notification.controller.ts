import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendPaginated } from '../../core/response/envelope.js';
import { toAdminNotification } from './admin-notification.mapper.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as { page: number; pageSize: number };
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.adminNotificationService.listRecent({ skip, limit: pageSize });

  sendPaginated(res, items.map(toAdminNotification), buildMeta(total, page, pageSize));
}
