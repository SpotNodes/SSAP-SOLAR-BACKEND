import type { HydratedDocument } from 'mongoose';
import type { Role } from '../../core/auth/roles.js';
import { UserModel, type UserSchemaType } from './user.model.js';

export interface UserEntity {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  cityState: string;
  companyName?: string;
  role: Role;
  mobileVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  mobile: string;
  email: string;
  address: string;
  cityState: string;
  companyName?: string;
  role: Role;
  mobileVerified: boolean;
}

export interface UpdateProfileData {
  name: string;
  email: string;
  address: string;
  cityState: string;
  companyName?: string;
}

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByMobile(mobile: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  updateProfile(id: string, data: UpdateProfileData): Promise<UserEntity | null>;
  markMobileVerified(id: string): Promise<void>;
}

function toEntity(doc: HydratedDocument<UserSchemaType>): UserEntity {
  return {
    id: doc._id.toString(),
    name: doc.name,
    mobile: doc.mobile,
    email: doc.email,
    address: doc.address,
    cityState: doc.cityState,
    companyName: doc.companyName ?? undefined,
    role: doc.role,
    mobileVerified: doc.mobileVerified,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const doc = await UserModel.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByMobile(mobile: string): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({ mobile });
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const doc = await UserModel.create(data);
    return toEntity(doc);
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<UserEntity | null> {
    const doc = await UserModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async markMobileVerified(id: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { mobileVerified: true });
  }
}
