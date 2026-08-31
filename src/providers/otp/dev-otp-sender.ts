import { logger } from '../../core/logger/logger.js';
import type { OtpPurpose, OtpSender } from './otp-sender.js';

// No real SMS provider wired yet — logs the code so local/dev testing doesn't need a live gateway.
// Swap OTP_PROVIDER in env for a real adapter (MSG91/Twilio) once credentials exist; no other
// code changes. The inbox lets integration tests read back the last code sent to a mobile number
// without needing a real gateway (codes are argon2-hashed at rest, so there's no other way to
// recover the plaintext for a test to submit).
export const devOtpInbox = new Map<string, string>();

export class DevOtpSender implements OtpSender {
  async send(mobile: string, code: string, purpose: OtpPurpose): Promise<void> {
    devOtpInbox.set(mobile, code);
    logger.info({ mobile, code, purpose }, '[dev-otp] OTP code (not actually sent)');
  }
}
