import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import { getEnquiry, listEnquiries, updateEnquiry } from './admin-enquiry.controller.js';
import { adminEnquiryQuerySchema, updateEnquirySchema } from './admin-enquiry.schema.js';

export const adminEnquiryRouter = Router();

adminEnquiryRouter.get('/', validate({ query: adminEnquiryQuerySchema }), asyncHandler(listEnquiries));
adminEnquiryRouter.get('/:id', asyncHandler(getEnquiry));
adminEnquiryRouter.patch(
  '/:id',
  validate({ body: updateEnquirySchema }),
  asyncHandler(updateEnquiry),
);
