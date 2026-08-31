import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';
import type { OtpPurpose } from '../../providers/otp/otp-sender.js';

export interface OtpRequestSchemaType {
  requestId: string;
  mobile: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  consumedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const otpRequestSchema = new Schema<OtpRequestSchemaType>({
  requestId: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  purpose: { type: String, enum: ['LOGIN', 'REGISTER'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, required: true, default: 0 },
  consumedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, required: true, default: () => new Date() },
});

otpRequestSchema.index({ mobile: 1, createdAt: -1 });
// TTL cleanup — keep the collection bounded; a short grace period past expiry doesn't matter
// since expired rows are already rejected by the service's own expiry check.
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpRequestModel = getOrCreateModel<OtpRequestSchemaType>('OtpRequest', otpRequestSchema);
