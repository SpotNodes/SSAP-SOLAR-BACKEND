import { generateOpaqueToken, hashOpaqueToken } from '../../core/auth/opaque-token.js';
import { hashSecret, verifySecret } from '../../core/auth/secret-hash.js';
import type { TokenPair, TokenService } from '../../core/auth/token.service.js';
import { Role } from '../../core/auth/roles.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import { isDuplicateKeyError } from '../../core/db/mongo-errors.js';
import { toE164India } from '../../core/validation/mobile.js';
import type { OtpSender, OtpPurpose } from '../../providers/otp/otp-sender.js';
import { toPublicUser, type PublicUser } from '../users/user.mapper.js';
import type { CreateUserData, UserRepository } from '../users/user.repository.js';
import { generateOtpCode, generateOtpRequestId } from './otp-code.js';
import {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_HOUR,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  VERIFICATION_TOKEN_TTL_MS,
} from './otp.constants.js';
import type { OtpRepository } from './otp.repository.js';
import type { VerificationTokenRepository } from './verification-token.repository.js';
import type { RegisterBody } from './auth.schema.js';

export interface RequestOtpResult {
  requestId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface VerifyOtpResult {
  verificationToken: string;
  expiresInSeconds: number;
}

export interface AuthSessionResult extends TokenPair {
  user: PublicUser;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly verificationTokens: VerificationTokenRepository,
    private readonly otpSender: OtpSender,
    private readonly tokens: TokenService,
  ) {}

  async requestOtp(rawMobile: string, purpose: OtpPurpose): Promise<RequestOtpResult> {
    const mobile = toE164India(rawMobile);
    const existing = await this.users.findByMobile(mobile);

    if (purpose === 'LOGIN' && !existing) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, 'No account found for this number. Please register.');
    }
    if (purpose === 'REGISTER' && existing) {
      throw new AppError(ErrorCode.ACCOUNT_EXISTS, 'An account with this number already exists.');
    }

    const latest = await this.otps.findLatestByMobile(mobile);
    if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Please wait before requesting another code.');
    }

    const recentCount = await this.otps.countRecentByMobile(mobile, new Date(Date.now() - 60 * 60 * 1000));
    if (recentCount >= OTP_MAX_PER_HOUR) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Too many OTP requests. Please try again later.');
    }

    const code = generateOtpCode();
    const codeHash = await hashSecret(code);
    const requestId = generateOtpRequestId();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.otps.create({ requestId, mobile, purpose, codeHash, expiresAt });
    await this.otpSender.send(mobile, code, purpose);

    return {
      requestId,
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    };
  }

  async verifyOtp(requestId: string, rawMobile: string, otp: string): Promise<VerifyOtpResult> {
    const mobile = toE164India(rawMobile);
    const record = await this.otps.findByRequestId(requestId);

    if (!record || record.mobile !== mobile) {
      throw new AppError(ErrorCode.OTP_INVALID, 'Incorrect OTP. Please try again.');
    }
    if (record.consumedAt) {
      throw new AppError(ErrorCode.OTP_INVALID, 'This code has already been used.');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError(ErrorCode.OTP_EXPIRED, 'This code has expired. Please request a new one.');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(ErrorCode.OTP_LOCKED, 'Too many incorrect attempts. Please request a new code.');
    }

    const valid = await verifySecret(record.codeHash, otp);
    if (!valid) {
      await this.otps.incrementAttempts(requestId);
      throw new AppError(ErrorCode.OTP_INVALID, 'Incorrect OTP. Please try again.');
    }

    await this.otps.markConsumed(requestId);

    const token = generateOpaqueToken('vt');
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    await this.verificationTokens.create({ tokenHash, mobile, purpose: record.purpose, expiresAt });

    return { verificationToken: token, expiresInSeconds: VERIFICATION_TOKEN_TTL_MS / 1000 };
  }

  private async consumeVerificationToken(
    token: string,
    mobile: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const tokenHash = hashOpaqueToken(token);
    const record = await this.verificationTokens.findByHash(tokenHash);

    const isValid =
      record &&
      !record.consumedAt &&
      record.expiresAt.getTime() >= Date.now() &&
      record.mobile === mobile &&
      record.purpose === purpose;

    if (!isValid) {
      throw new AppError(
        ErrorCode.VERIFICATION_INVALID,
        'Verification expired or invalid. Please request a new OTP.',
      );
    }

    await this.verificationTokens.markConsumed(record.id);
  }

  async login(rawMobile: string, verificationToken: string): Promise<AuthSessionResult> {
    const mobile = toE164India(rawMobile);
    await this.consumeVerificationToken(verificationToken, mobile, 'LOGIN');

    const user = await this.users.findByMobile(mobile);
    if (!user) {
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, 'No account found for this number. Please register.');
    }
    if (!user.mobileVerified) {
      await this.users.markMobileVerified(user.id);
    }

    const tokenPair = await this.tokens.issueTokenPair(user.id, Role.CUSTOMER);
    return { ...tokenPair, user: toPublicUser(user) };
  }

  async register(input: RegisterBody): Promise<AuthSessionResult> {
    const mobile = toE164India(input.mobile);
    await this.consumeVerificationToken(input.verificationToken, mobile, 'REGISTER');

    const existing = await this.users.findByMobile(mobile);
    if (existing) {
      throw new AppError(ErrorCode.ACCOUNT_EXISTS, 'An account with this number already exists.');
    }

    const createData: CreateUserData = {
      name: input.name,
      mobile,
      email: input.email,
      address: input.address,
      cityState: input.cityState,
      companyName: input.companyName,
      role: Role.CUSTOMER,
      mobileVerified: true,
    };

    let user;
    try {
      user = await this.users.create(createData);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new AppError(ErrorCode.ACCOUNT_EXISTS, 'An account with this number already exists.');
      }
      throw err;
    }

    const tokenPair = await this.tokens.issueTokenPair(user.id, Role.CUSTOMER);
    return { ...tokenPair, user: toPublicUser(user) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.rotate(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }
}
