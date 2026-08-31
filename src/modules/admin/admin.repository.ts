import { AdminModel } from './admin.model.js';

export interface AdminEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
}

export interface AdminRepository {
  findByEmail(email: string): Promise<AdminEntity | null>;
  countAll(): Promise<number>;
  create(data: { name: string; email: string; passwordHash: string }): Promise<AdminEntity>;
}

export class MongoAdminRepository implements AdminRepository {
  async findByEmail(email: string): Promise<AdminEntity | null> {
    const doc = await AdminModel.findOne({ email: email.toLowerCase() });
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      isActive: doc.isActive,
    };
  }

  async countAll(): Promise<number> {
    return AdminModel.countDocuments();
  }

  async create(data: { name: string; email: string; passwordHash: string }): Promise<AdminEntity> {
    const doc = await AdminModel.create(data);
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      isActive: doc.isActive,
    };
  }
}
