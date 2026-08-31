import { z } from 'zod';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { EnquiryStatus } from '../enquiries/enquiry-enums.js';

const enquiryStatusValues = Object.values(EnquiryStatus) as [EnquiryStatus, ...EnquiryStatus[]];
export const enquiryStatusSchema = z.enum(enquiryStatusValues);

export const adminEnquiryQuerySchema = paginationQuerySchema.extend({
  status: enquiryStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export const updateEnquirySchema = z
  .object({
    status: enquiryStatusSchema.optional(),
    internalNote: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.status !== undefined || data.internalNote !== undefined, {
    message: 'Provide status and/or internalNote.',
  });

export type AdminEnquiryQuery = z.infer<typeof adminEnquiryQuerySchema>;
export type UpdateEnquiryBody = z.infer<typeof updateEnquirySchema>;
