import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';
import type { OtpPurpose } from '../../providers/otp/otp-sender.js';

export interface VerificationTokenSchemaType {
  tokenHash: string;
  mobile: string;
  purpose: OtpPurpose;
  consumedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const verificationTokenSchema = new Schema<VerificationTokenSchemaType>({
  tokenHash: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  purpose: { type: String, enum: ['LOGIN', 'REGISTER'], required: true },
  consumedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, required: true, default: () => new Date() },
});

verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationTokenModel = getOrCreateModel<VerificationTokenSchemaType>(
  'VerificationToken',
  verificationTokenSchema,
);
