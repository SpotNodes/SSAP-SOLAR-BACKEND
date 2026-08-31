import { z } from 'zod';

export const registerDeviceSchema = z.object({
  expoPushToken: z.string().trim().min(1),
  platform: z.enum(['ios', 'android']),
});

export type RegisterDeviceBody = z.infer<typeof registerDeviceSchema>;
