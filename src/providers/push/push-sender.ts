export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  // Tokens the provider reported as permanently invalid (e.g. Expo's DeviceNotRegistered) —
  // the caller is responsible for pruning these from storage, not this interface.
  invalidTokens: string[];
}

export interface PushSender {
  send(expoPushTokens: string[], message: PushMessage): Promise<PushSendResult>;
}
