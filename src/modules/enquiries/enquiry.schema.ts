import { z } from 'zod';
import { emailSchema, mobileSchema, nameSchema } from '../../core/validation/common-schemas.js';
import { EnquirySource } from './enquiry-enums.js';

const enquirySourceValues = Object.values(EnquirySource) as [EnquirySource, ...EnquirySource[]];

export const createEnquirySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  name: nameSchema,
  mobile: mobileSchema,
  email: emailSchema,
  message: z.string().trim().min(1).max(2000),
  requirement: z.string().trim().min(1).max(1000).optional(),
  quantity: z.number().int().min(1).optional(),
  source: z.enum(enquirySourceValues),
});

export type CreateEnquiryBody = z.infer<typeof createEnquirySchema>;
