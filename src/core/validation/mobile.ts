// India-only today (PRD scope #1: default country code +91, 10-digit mobile). Revisit if
// multi-country support is ever added — the app's domain types don't carry a separate dial code.
// DB storage is canonical E.164; the API always presents the raw 10-digit form the app already
// works with everywhere (its own mock user is "9999999999", never "+919999999999").
export function toE164India(mobile: string): string {
  return `+91${mobile}`;
}

export function fromE164India(mobile: string): string {
  return mobile.startsWith('+91') ? mobile.slice(3) : mobile;
}
