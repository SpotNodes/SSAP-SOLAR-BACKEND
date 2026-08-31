import { logger } from '../../core/logger/logger.js';
import type { PushMessage, PushSendResult, PushSender } from './push-sender.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo's documented cap per request.
const CHUNK_SIZE = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Expo's push API is keyless for basic sending — no account/credentials needed, unlike
// MSG91/Twilio. This only covers the immediate per-token errors Expo returns in the send
// response itself (including DeviceNotRegistered when it catches it early); the fuller flow
// (polling the separate receipts endpoint ~15 min later for delivery-time failures) needs a
// job scheduler this project doesn't have yet — not implemented.
export class ExpoPushSender implements PushSender {
  async send(expoPushTokens: string[], message: PushMessage): Promise<PushSendResult> {
    const invalidTokens: string[] = [];

    for (const tokens of chunk(expoPushTokens, CHUNK_SIZE)) {
      const payload = tokens.map((to) => ({
        to,
        title: message.title,
        body: message.body,
        data: message.data,
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        logger.error({ status: res.status }, 'Expo push API request failed');
        continue;
      }

      const body = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = body.data ?? [];

      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          logger.warn({ token: tokens[i], ticket }, 'Expo push ticket error');
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(tokens[i]!);
          }
        }
      });
    }

    return { invalidTokens };
  }
}
