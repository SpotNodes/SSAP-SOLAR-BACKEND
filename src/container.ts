import { env } from './config/env.js';
import { MongoRefreshTokenRepository } from './core/auth/refresh-token.repository.js';
import { TokenService } from './core/auth/token.service.js';
import { MongoAdminRepository } from './modules/admin/admin.repository.js';
import { AdminAuthService } from './modules/admin/admin-auth.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { MongoOtpRepository } from './modules/auth/otp.repository.js';
import { MongoVerificationTokenRepository } from './modules/auth/verification-token.repository.js';
import { MongoUserRepository } from './modules/users/user.repository.js';
import { UserService } from './modules/users/user.service.js';
import { DevOtpSender } from './providers/otp/dev-otp-sender.js';
import type { OtpSender } from './providers/otp/otp-sender.js';

function createOtpSender(): OtpSender {
  switch (env.OTP_PROVIDER) {
    case 'dev':
      return new DevOtpSender();
    default:
      throw new Error(`OTP provider "${env.OTP_PROVIDER}" is not implemented yet.`);
  }
}

const refreshTokenRepository = new MongoRefreshTokenRepository();
const tokenService = new TokenService(refreshTokenRepository);

const userRepository = new MongoUserRepository();
const otpRepository = new MongoOtpRepository();
const verificationTokenRepository = new MongoVerificationTokenRepository();
const otpSender = createOtpSender();

const adminRepository = new MongoAdminRepository();

export const container = {
  tokenService,
  userService: new UserService(userRepository),
  authService: new AuthService(userRepository, otpRepository, verificationTokenRepository, otpSender, tokenService),
  adminAuthService: new AdminAuthService(adminRepository, tokenService),
  adminRepository,
};
