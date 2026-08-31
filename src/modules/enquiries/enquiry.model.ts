import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';
import { EnquirySource, EnquiryStatus } from './enquiry-enums.js';

export interface EnquirySchemaType {
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
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<EnquirySchemaType>(
  {
    productId: { type: String },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    requirement: { type: String },
    quantity: { type: Number, min: 1 },
    source: { type: String, enum: Object.values(EnquirySource), required: true },
    status: { type: String, enum: Object.values(EnquiryStatus), required: true, default: EnquiryStatus.New },
    internalNote: { type: String },
  },
  { timestamps: true },
);

enquirySchema.index({ status: 1, createdAt: -1 });

export const EnquiryModel = getOrCreateModel<EnquirySchemaType>('Enquiry', enquirySchema);
