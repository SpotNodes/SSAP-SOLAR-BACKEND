// Backend-only — enquiries aren't in the app's mock types (this is new website/backend surface),
// so unlike core/enums.ts these don't mirror an external contract.
export const EnquirySource = {
  Web: 'WEB',
  App: 'APP',
} as const;
export type EnquirySource = (typeof EnquirySource)[keyof typeof EnquirySource];

export const EnquiryStatus = {
  New: 'NEW',
  Contacted: 'CONTACTED',
  Closed: 'CLOSED',
} as const;
export type EnquiryStatus = (typeof EnquiryStatus)[keyof typeof EnquiryStatus];
