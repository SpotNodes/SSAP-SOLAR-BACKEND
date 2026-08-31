import { z } from 'zod';
import {
  addressSchema,
  cityStateSchema,
  companyNameSchema,
  emailSchema,
  mobileSchema,
  nameSchema,
  otpCodeSchema,
} from '../../core/validation/common-schemas.js';

export const requestOtpSchema = z.object({
  mobile: mobileSchema,
  purpose: z.enum(['LOGIN', 'REGISTER']),
});

export const verifyOtpSchema = z.object({
  requestId: z.string().min(1),
  mobile: mobileSchema,
  otp: otpCodeSchema,
});

export const loginSchema = z.object({
  mobile: mobileSchema,
  verificationToken: z.string().min(1),
});

export const registerSchema = z.object({
  verificationToken: z.string().min(1),
  name: nameSchema,
  mobile: mobileSchema,
  email: emailSchema,
  address: addressSchema,
  cityState: cityStateSchema,
  companyName: companyNameSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenSchema>;
