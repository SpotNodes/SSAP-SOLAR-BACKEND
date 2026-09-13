import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendOk, sendPaginated } from '../../core/response/envelope.js';
import { toPublicUserNotification } from './user-notification.mapper.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as { page: number; pageSize: number };
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.userNotificationService.listForUser(req.auth!.id, {
    skip,
    limit: pageSize,
  });

  // The unread count is deliberately NOT folded into `meta` — PaginationMeta is
  // a shared contract every paginated endpoint returns. The badge has its own
  // endpoint because it must work when this screen isn't even open.
  sendPaginated(res, items.map(toPublicUserNotification), buildMeta(total, page, pageSize));
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const unread = await container.userNotificationService.countUnread(req.auth!.id);
  sendOk(res, { unread });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  await container.userNotificationService.markRead(req.params.id as string, req.auth!.id);
  sendOk(res, { ok: true });
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  const updated = await container.userNotificationService.markAllRead(req.auth!.id);
  sendOk(res, { updated });
}
