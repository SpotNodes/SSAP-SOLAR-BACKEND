import { Schema } from 'mongoose';
import { getOrCreateModel } from '../db/model-factory.js';
import { Role } from './roles.js';

export interface RefreshTokenSchemaType {
  jti: string;
  subjectId: string;
  role: Role;
  expiresAt: Date;
  revokedAt?: Date | null;
}

const refreshTokenSchema = new Schema<RefreshTokenSchemaType>({
  jti: { type: String, required: true, unique: true },
  subjectId: { type: String, required: true },
  role: { type: String, enum: Object.values(Role), required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
});

// TTL cleanup — expired refresh tokens (rotated or not) self-delete.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = getOrCreateModel<RefreshTokenSchemaType>(
  'RefreshToken',
  refreshTokenSchema,
);
