import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';

export interface AdminSchemaType {
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminSchemaType>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export const AdminModel = getOrCreateModel<AdminSchemaType>('Admin', adminSchema);
