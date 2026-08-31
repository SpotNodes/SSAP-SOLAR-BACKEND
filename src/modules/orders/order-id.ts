import { randomInt } from 'node:crypto';

// Unambiguous alphabet per PRD §6.4 — no 0/O/1/I/L.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomSuffix(length = 4): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return result;
}

export function generateOrderId(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `SSAP-${yyyy}${mm}${dd}-${randomSuffix()}`;
}
