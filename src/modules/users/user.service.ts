import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { UpdateProfileData, UserEntity, UserRepository } from './user.repository.js';

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async getById(id: string): Promise<UserEntity> {
    const user = await this.users.findById(id);
    if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED, 'Account no longer exists.');
    return user;
  }

  async updateProfile(id: string, data: UpdateProfileData): Promise<UserEntity> {
    const updated = await this.users.updateProfile(id, data);
    if (!updated) throw new AppError(ErrorCode.UNAUTHENTICATED, 'Account no longer exists.');
    return updated;
  }
}
