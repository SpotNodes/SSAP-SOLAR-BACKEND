import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendOk, sendPaginated } from '../../core/response/envelope.js';
import { toAdminOrder } from './admin-order.mapper.js';
import type {
  AdminOrderQuery,
  UpdateOrderPaymentBody,
  UpdateOrderStatusBody,
} from './admin-order.schema.js';

export async function listOrders(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as AdminOrderQuery;
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.adminOrderService.search({
    status: query.status,
    paymentStatus: query.paymentStatus,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    search: query.search,
    skip,
    limit: pageSize,
  });

  sendPaginated(res, items.map(toAdminOrder), buildMeta(total, page, pageSize));
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await container.adminOrderService.getById(req.params.id as string);
  sendOk(res, toAdminOrder(order));
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { status, note } = req.body as UpdateOrderStatusBody;
  const order = await container.adminOrderService.updateStatus(req.params.id as string, status, note);
  sendOk(res, toAdminOrder(order));
}

export async function updateOrderPayment(req: Request, res: Response): Promise<void> {
  const { paymentStatus } = req.body as UpdateOrderPaymentBody;
  const order = await container.adminOrderService.updatePaymentStatus(
    req.params.id as string,
    paymentStatus,
  );
  sendOk(res, toAdminOrder(order));
}
