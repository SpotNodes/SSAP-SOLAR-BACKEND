import { fromE164India } from '../../core/validation/mobile.js';
import type { EnquirySource, EnquiryStatus } from '../enquiries/enquiry-enums.js';
import type { EnquiryEntity } from '../enquiries/enquiry.repository.js';

export interface AdminEnquiry {
  id: string;
  productId?: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  requirement?: string;
  quantity?: number;
  source: EnquirySource;
  status: EnquiryStatus;
  internalNote?: string;
  createdAt: string;
  updatedAt: string;
}

export function toAdminEnquiry(enquiry: EnquiryEntity): AdminEnquiry {
  return {
    id: enquiry.id,
    ...(enquiry.productId ? { productId: enquiry.productId } : {}),
    name: enquiry.name,
    mobile: fromE164India(enquiry.mobile),
    email: enquiry.email,
    message: enquiry.message,
    ...(enquiry.requirement ? { requirement: enquiry.requirement } : {}),
    ...(enquiry.quantity ? { quantity: enquiry.quantity } : {}),
    source: enquiry.source,
    status: enquiry.status,
    ...(enquiry.internalNote ? { internalNote: enquiry.internalNote } : {}),
    createdAt: enquiry.createdAt.toISOString(),
    updatedAt: enquiry.updatedAt.toISOString(),
  };
}
