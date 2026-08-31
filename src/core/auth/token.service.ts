import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import type { RefreshTokenRepository } from './refresh-token.repository.js';
import type { Role } from './roles.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

interface RefreshTokenPayload {
  sub: string;
  role: Role;
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Access token expired.');
      }
      throw new AppError(ErrorCode.UNAUTHENTICATED, 'Invalid access token.');
    }
  }

  async issueTokenPair(subjectId: string, role: Role): Promise<TokenPair> {
    const jti = randomUUID();
    const refreshToken = jwt.sign({ sub: subjectId, role, jti }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_TTL,
    } as jwt.SignOptions);

    const decoded = jwt.decode(refreshToken) as { exp: number };
    await this.refreshTokens.create({
      jti,
      subjectId,
      role,
      expiresAt: new Date(decoded.exp * 1000),
    });

    const accessToken = this.signAccessToken({ sub: subjectId, role });
    return { accessToken, refreshToken };
  }

  private verifyRefreshJwt(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw new AppError(ErrorCode.TOKEN_INVALID, 'Invalid or expired refresh token.');
    }
  }

  async rotate(refreshToken: string): Promise<TokenPair> {
    const payload = this.verifyRefreshJwt(refreshToken);
    const stored = await this.refreshTokens.findByJti(payload.jti);
    if (!stored || stored.revokedAt) {
      throw new AppError(ErrorCode.TOKEN_INVALID, 'Invalid or expired refresh token.');
    }
    await this.refreshTokens.revoke(payload.jti);
    return this.issueTokenPair(payload.sub, payload.role);
  }

  // Best-effort: logout should never fail the client even with a garbled/expired token.
  async revoke(refreshToken: string): Promise<void> {
    try {
      const payload = this.verifyRefreshJwt(refreshToken);
      await this.refreshTokens.revoke(payload.jti);
    } catch {
      // ignore
    }
  }
}
