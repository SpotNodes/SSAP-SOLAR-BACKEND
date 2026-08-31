import { logger } from '../../core/logger/logger.js';
import type { EmailMessage, EmailSender } from './email-sender.js';

// No real SMTP provider wired yet — logs instead of sending. Swap EMAIL_PROVIDER=smtp in env
// once credentials exist; no other code changes. The outbox lets integration tests observe what
// was "sent" (mirrors devOtpInbox in providers/otp/dev-otp-sender.ts).
export const devEmailOutbox: EmailMessage[] = [];

export class DevEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    devEmailOutbox.push(message);
    logger.info({ ...message }, '[dev-email] email (not actually sent)');
  }
}
