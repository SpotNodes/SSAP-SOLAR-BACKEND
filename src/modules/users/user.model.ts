import { Schema } from 'mongoose';
import { Role } from '../../core/auth/roles.js';
import { getOrCreateModel } from '../../core/db/model-factory.js';

export interface UserSchemaType {
  name: string;
  mobile: string;
  email: string;
  address: string;
  cityState: string;
  companyName?: string | null;
  role: Role;
  mobileVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserSchemaType>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    cityState: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: null },
    role: { type: String, enum: Object.values(Role), required: true, default: Role.CUSTOMER },
    mobileVerified: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const UserModel = getOrCreateModel<UserSchemaType>('User', userSchema);
