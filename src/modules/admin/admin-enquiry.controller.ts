import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { buildMeta, toPaginationParams } from '../../core/pagination/pagination.js';
import { sendOk, sendPaginated } from '../../core/response/envelope.js';
import { toAdminEnquiry } from './admin-enquiry.mapper.js';
import type { AdminEnquiryQuery, UpdateEnquiryBody } from './admin-enquiry.schema.js';

export async function listEnquiries(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as unknown as AdminEnquiryQuery;
  const { page, pageSize, skip } = toPaginationParams(query);

  const { items, total } = await container.adminEnquiryService.search({
    status: query.status,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    search: query.search,
    skip,
    limit: pageSize,
  });

  sendPaginated(res, items.map(toAdminEnquiry), buildMeta(total, page, pageSize));
}

export async function getEnquiry(req: Request, res: Response): Promise<void> {
  const enquiry = await container.adminEnquiryService.getById(req.params.id as string);
  sendOk(res, toAdminEnquiry(enquiry));
}

export async function updateEnquiry(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateEnquiryBody;
  const enquiry = await container.adminEnquiryService.update(req.params.id as string, body);
  sendOk(res, toAdminEnquiry(enquiry));
}
