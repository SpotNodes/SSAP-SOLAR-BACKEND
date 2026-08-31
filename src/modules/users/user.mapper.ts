import { fromE164India } from '../../core/validation/mobile.js';
import type { UserEntity } from './user.repository.js';

// Exactly the app's User shape — role/mobileVerified/timestamps are backend-only and never leak.
export interface PublicUser {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  cityState: string;
  companyName?: string;
}

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    name: user.name,
    mobile: fromE164India(user.mobile),
    email: user.email,
    address: user.address,
    cityState: user.cityState,
    ...(user.companyName ? { companyName: user.companyName } : {}),
  };
}
