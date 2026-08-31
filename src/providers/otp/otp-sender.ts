export type OtpPurpose = 'LOGIN' | 'REGISTER';

export interface OtpSender {
  send(mobile: string, code: string, purpose: OtpPurpose): Promise<void>;
}
