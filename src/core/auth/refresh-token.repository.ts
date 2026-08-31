import { RefreshTokenModel } from './refresh-token.model.js';
import type { Role } from './roles.js';

export interface RefreshTokenRecord {
  jti: string;
  subjectId: string;
  role: Role;
  expiresAt: Date;
  revokedAt?: Date | null;
}

export interface RefreshTokenRepository {
  create(data: { jti: string; subjectId: string; role: Role; expiresAt: Date }): Promise<void>;
  findByJti(jti: string): Promise<RefreshTokenRecord | null>;
  revoke(jti: string): Promise<void>;
}

export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  async create(data: { jti: string; subjectId: string; role: Role; expiresAt: Date }): Promise<void> {
    await RefreshTokenModel.create(data);
  }

  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    const doc = await RefreshTokenModel.findOne({ jti }).lean();
    if (!doc) return null;
    return {
      jti: doc.jti,
      subjectId: doc.subjectId,
      role: doc.role,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
    };
  }

  async revoke(jti: string): Promise<void> {
    await RefreshTokenModel.updateOne({ jti }, { revokedAt: new Date() });
  }
}
