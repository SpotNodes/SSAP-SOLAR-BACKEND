import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import { toPublicEnquiry } from './enquiry.mapper.js';
import type { CreateEnquiryBody } from './enquiry.schema.js';

export async function createEnquiry(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateEnquiryBody;
  const enquiry = await container.enquiryService.submit(body);
  sendOk(res, toPublicEnquiry(enquiry), 201);
}
