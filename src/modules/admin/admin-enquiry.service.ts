import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type {
  AdminEnquirySearchParams,
  EnquiryEntity,
  EnquiryRepository,
  UpdateEnquiryData,
} from '../enquiries/enquiry.repository.js';

export class AdminEnquiryService {
  constructor(private readonly enquiries: EnquiryRepository) {}

  async search(params: AdminEnquirySearchParams): Promise<{ items: EnquiryEntity[]; total: number }> {
    return this.enquiries.searchAdmin(params);
  }

  async getById(id: string): Promise<EnquiryEntity> {
    const enquiry = await this.enquiries.findById(id);
    if (!enquiry) throw new AppError(ErrorCode.ENQUIRY_NOT_FOUND, 'Enquiry not found.');
    return enquiry;
  }

  async update(id: string, data: UpdateEnquiryData): Promise<EnquiryEntity> {
    const updated = await this.enquiries.update(id, data);
    if (!updated) throw new AppError(ErrorCode.ENQUIRY_NOT_FOUND, 'Enquiry not found.');
    return updated;
  }
}
