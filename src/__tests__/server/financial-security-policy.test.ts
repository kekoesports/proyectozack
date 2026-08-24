import {
  evaluateFinancialSecurity,
  FINANCIAL_FRESH_SESSION_MS,
} from '@/lib/security/financial-security-policy';

const NOW = new Date('2026-08-25T10:00:00.000Z');

describe('financial security policy', () => {
  it('requires 2FA for read access to bank data', () => {
    expect(evaluateFinancialSecurity({
      twoFactorEnabled: false,
      action: 'read',
      sessionCreatedAt: NOW,
      now: NOW,
    })).toBe('two_factor_required');
  });

  it('allows bank read access with 2FA even when the session is older', () => {
    expect(evaluateFinancialSecurity({
      twoFactorEnabled: true,
      action: 'read',
      sessionCreatedAt: new Date(NOW.getTime() - FINANCIAL_FRESH_SESSION_MS * 2),
      now: NOW,
    })).toBeNull();
  });

  it('requires a recent login for bank writes', () => {
    expect(evaluateFinancialSecurity({
      twoFactorEnabled: true,
      action: 'write',
      sessionCreatedAt: new Date(NOW.getTime() - FINANCIAL_FRESH_SESSION_MS),
      now: NOW,
    })).toBe('fresh_login_required');
  });

  it('allows a recent 2FA session to modify bank data', () => {
    expect(evaluateFinancialSecurity({
      twoFactorEnabled: true,
      action: 'write',
      sessionCreatedAt: new Date(NOW.getTime() - FINANCIAL_FRESH_SESSION_MS + 1),
      now: NOW,
    })).toBeNull();
  });

  it('fails closed when the session timestamp is in the future', () => {
    expect(evaluateFinancialSecurity({
      twoFactorEnabled: true,
      action: 'delete',
      sessionCreatedAt: new Date(NOW.getTime() + 1),
      now: NOW,
    })).toBe('fresh_login_required');
  });
});
