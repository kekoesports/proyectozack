import type { Action } from '@/lib/permissions';

export const FINANCIAL_FRESH_SESSION_MS = 60 * 60 * 1000;

export type FinancialSecurityCode =
  | 'two_factor_required'
  | 'fresh_login_required';

export function evaluateFinancialSecurity(input: {
  readonly twoFactorEnabled: boolean;
  readonly action: Action;
  readonly sessionCreatedAt: Date;
  readonly now?: Date;
}): FinancialSecurityCode | null {
  if (!input.twoFactorEnabled) return 'two_factor_required';
  if (input.action === 'read') return null;

  const now = input.now?.getTime() ?? Date.now();
  const age = now - input.sessionCreatedAt.getTime();
  if (age < 0 || age >= FINANCIAL_FRESH_SESSION_MS) return 'fresh_login_required';
  return null;
}
