import { z } from 'zod';
import {
  addressSchema,
  cityStateSchema,
  companyNameSchema,
  emailSchema,
  nameSchema,
} from '../../core/validation/common-schemas.js';

export const updateProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  address: addressSchema,
  cityState: cityStateSchema,
  companyName: companyNameSchema,
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
