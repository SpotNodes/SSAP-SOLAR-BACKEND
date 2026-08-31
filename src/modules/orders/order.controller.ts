import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendOk, sendPaginated } from '../../core/response/envelope.js';
import { toPublicOrder } from './order.mapper.js';
import type { CreateOrderBody } from './order.schema.js';

export async function createOrder(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateOrderBody;
  const idempotencyKeyHeader = req.header('Idempotency-Key');
  const order = await container.orderService.placeOrder(req.auth!.id, body, idempotencyKeyHeader);
  sendOk(res, toPublicOrder(order), 201);
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as { page: number; pageSize: number };
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.orderService.listForUser(req.auth!.id, {
    skip,
    limit: pageSize,
  });

  sendPaginated(res, items.map(toPublicOrder), buildMeta(total, page, pageSize));
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await container.orderService.getByIdForUser(req.params.id as string, req.auth!.id);
  sendOk(res, toPublicOrder(order));
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const order = await container.orderService.cancelOrder(req.params.id as string, req.auth!.id);
  sendOk(res, toPublicOrder(order));
}
