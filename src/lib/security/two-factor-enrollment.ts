// Scoped rollout requested by the account administrator on 2026-09-10.
// This selects enrollment UI only; it never replaces password verification or roles.
const ENROLLMENT_USER_ID = '72ItB5X7hnV9NdaTpp0CGWXvlBk7NhWF';

export function needsTwoFactorEnrollment(userId: string, enabled: boolean): boolean {
  return userId === ENROLLMENT_USER_ID && !enabled;
}
