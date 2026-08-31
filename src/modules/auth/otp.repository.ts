import type { HydratedDocument } from 'mongoose';
import type { OtpPurpose } from '../../providers/otp/otp-sender.js';
import { OtpRequestModel, type OtpRequestSchemaType } from './otp.model.js';

export interface OtpRequestEntity {
  requestId: string;
  mobile: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  consumedAt?: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface OtpRepository {
  create(data: {
    requestId: string;
    mobile: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findByRequestId(requestId: string): Promise<OtpRequestEntity | null>;
  findLatestByMobile(mobile: string): Promise<OtpRequestEntity | null>;
  countRecentByMobile(mobile: string, since: Date): Promise<number>;
  incrementAttempts(requestId: string): Promise<void>;
  markConsumed(requestId: string): Promise<void>;
}

function toEntity(doc: HydratedDocument<OtpRequestSchemaType>): OtpRequestEntity {
  return {
    requestId: doc.requestId,
    mobile: doc.mobile,
    purpose: doc.purpose,
    codeHash: doc.codeHash,
    attempts: doc.attempts,
    consumedAt: doc.consumedAt,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
  };
}

export class MongoOtpRepository implements OtpRepository {
  async create(data: {
    requestId: string;
    mobile: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await OtpRequestModel.create(data);
  }

  async findByRequestId(requestId: string): Promise<OtpRequestEntity | null> {
    const doc = await OtpRequestModel.findOne({ requestId });
    return doc ? toEntity(doc) : null;
  }

  async findLatestByMobile(mobile: string): Promise<OtpRequestEntity | null> {
    const doc = await OtpRequestModel.findOne({ mobile }).sort({ createdAt: -1 });
    return doc ? toEntity(doc) : null;
  }

  async countRecentByMobile(mobile: string, since: Date): Promise<number> {
    return OtpRequestModel.countDocuments({ mobile, createdAt: { $gte: since } });
  }

  async incrementAttempts(requestId: string): Promise<void> {
    await OtpRequestModel.updateOne({ requestId }, { $inc: { attempts: 1 } });
  }

  async markConsumed(requestId: string): Promise<void> {
    await OtpRequestModel.updateOne({ requestId }, { consumedAt: new Date() });
  }
}
