import { logger } from '../../core/logger/logger.js';
import type { PushMessage, PushSendResult, PushSender } from './push-sender.js';

// No real push provider wired yet — logs instead of calling Expo. Swap PUSH_PROVIDER=expo in env
// once the app registers real device tokens; no other code changes. The outbox lets integration
// tests observe what was "sent" without a real Expo project (mirrors devOtpInbox in
// providers/otp/dev-otp-sender.ts).
export const devPushOutbox: { tokens: string[]; message: PushMessage }[] = [];

export class DevPushSender implements PushSender {
  async send(expoPushTokens: string[], message: PushMessage): Promise<PushSendResult> {
    devPushOutbox.push({ tokens: expoPushTokens, message });
    logger.info({ expoPushTokens, message }, '[dev-push] push notification (not actually sent)');
    return { invalidTokens: [] };
  }
}
