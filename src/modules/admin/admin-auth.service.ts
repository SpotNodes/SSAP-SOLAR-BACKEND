import { hashSecret, verifySecret } from '../../core/auth/secret-hash.js';
import { Role } from '../../core/auth/roles.js';
import type { TokenPair, TokenService } from '../../core/auth/token.service.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { AdminRepository } from './admin.repository.js';

export interface AdminSessionResult extends TokenPair {
  admin: { id: string; name: string; email: string };
}

// Precomputed once so a login against an unknown email takes the same time as a real password
// check — otherwise response timing would leak which emails have accounts.
const DUMMY_HASH = await hashSecret('dummy-password-for-timing-safety');

export class AdminAuthService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string): Promise<AdminSessionResult> {
    const admin = await this.admins.findByEmail(email);
    const valid = await verifySecret(admin?.passwordHash ?? DUMMY_HASH, password);

    if (!admin || !admin.isActive || !valid) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.');
    }

    const tokenPair = await this.tokens.issueTokenPair(admin.id, Role.ADMIN);
    return { ...tokenPair, admin: { id: admin.id, name: admin.name, email: admin.email } };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.rotate(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }
}
