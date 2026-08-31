import type { OtpPurpose } from '../../providers/otp/otp-sender.js';
import { VerificationTokenModel } from './verification-token.model.js';

export interface VerificationTokenEntity {
  id: string;
  tokenHash: string;
  mobile: string;
  purpose: OtpPurpose;
  consumedAt?: Date | null;
  expiresAt: Date;
}

export interface VerificationTokenRepository {
  create(data: {
    tokenHash: string;
    mobile: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<void>;
  findByHash(tokenHash: string): Promise<VerificationTokenEntity | null>;
  markConsumed(id: string): Promise<void>;
}

export class MongoVerificationTokenRepository implements VerificationTokenRepository {
  async create(data: {
    tokenHash: string;
    mobile: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): Promise<void> {
    await VerificationTokenModel.create(data);
  }

  async findByHash(tokenHash: string): Promise<VerificationTokenEntity | null> {
    const doc = await VerificationTokenModel.findOne({ tokenHash });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      tokenHash: doc.tokenHash,
      mobile: doc.mobile,
      purpose: doc.purpose,
      consumedAt: doc.consumedAt,
      expiresAt: doc.expiresAt,
    };
  }

  async markConsumed(id: string): Promise<void> {
    await VerificationTokenModel.updateOne({ _id: id }, { consumedAt: new Date() });
  }
}
