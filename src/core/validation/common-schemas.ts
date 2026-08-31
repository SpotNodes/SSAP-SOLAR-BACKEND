import { z } from 'zod';

export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.');

export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits.');

export const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters.').max(100);

export const emailSchema = z.string().trim().email('Enter a valid email address.');

export const addressSchema = z.string().trim().min(1, 'Address is required.').max(300);

export const cityStateSchema = z.string().trim().min(1, 'City/State is required.').max(150);

export const companyNameSchema = z.string().trim().min(1).max(150).optional();

// Query-string booleans arrive as the strings "true"/"false" — z.coerce.boolean() is a footgun
// here since Boolean("false") is true in JS.
export const booleanQueryParam = z
  .preprocess((val) => (typeof val === 'string' ? val === 'true' : val), z.boolean())
  .optional();
