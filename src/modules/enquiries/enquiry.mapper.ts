import { fromE164India } from '../../core/validation/mobile.js';
import type { EnquirySource, EnquiryStatus } from './enquiry-enums.js';
import type { EnquiryEntity } from './enquiry.repository.js';

// Confirmation payload for the submitter — internalNote is admin-only and never included.
export interface PublicEnquiry {
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
  createdAt: string;
}

export function toPublicEnquiry(enquiry: EnquiryEntity): PublicEnquiry {
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
    createdAt: enquiry.createdAt.toISOString(),
  };
}
