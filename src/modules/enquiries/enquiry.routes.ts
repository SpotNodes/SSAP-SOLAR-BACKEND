import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import { createEnquiry } from './enquiry.controller.js';
import { enquiryRateLimiter } from './enquiry-rate-limit.js';
import { createEnquirySchema } from './enquiry.schema.js';

export const enquiriesRouter = Router();

enquiriesRouter.post(
  '/',
  enquiryRateLimiter,
  validate({ body: createEnquirySchema }),
  asyncHandler(createEnquiry),
);
