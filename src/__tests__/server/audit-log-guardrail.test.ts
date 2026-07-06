/**
 * Guardrail estructural del audit log — Fase 1 legal.
 *
 * `logGiveawayEvent` acepta solo actions/outcomes del set cerrado
 * declarado en `src/db/schema/giveawayAuditEvents.ts`. Cualquier action
 * fuera se rechaza (return false) sin escribir en DB.
 */

import { AUDIT_ACTIONS, AUDIT_OUTCOMES } from '@/db/schema';

describe('sp_audit_events — set cerrado', () => {
  it('AUDIT_ACTIONS contiene las acciones canónicas (PR1 + rewards hub)', () => {
    expect([...AUDIT_ACTIONS].sort()).toEqual(
      [
        'partner_consent_granted',
        'partner_consent_revoked',
        'giveaway_participate',
        'free_raffle_participate',
        'raffle_winner_picked',
        'shop_redeem',
        'mission_verify',
        'mission_claim',
        'streak_claim',
      ].sort(),
    );
  });

  it('AUDIT_OUTCOMES contiene los 6 outcomes canónicos', () => {
    expect([...AUDIT_OUTCOMES].sort()).toEqual(
      [
        'success',
        'blocked',
        'error',
        'rate_limited',
        'already_done',
        'unauthorized',
      ].sort(),
    );
  });

  it('AUDIT_ACTIONS y AUDIT_OUTCOMES son arrays as const (no vacíos)', () => {
    expect(AUDIT_ACTIONS.length).toBeGreaterThan(0);
    expect(AUDIT_OUTCOMES.length).toBeGreaterThan(0);
    // Freeze — arrays declarados con `as const` son readonly en TS pero
    // no immutable en runtime. Comprobamos que no son de tamaño 0.
  });
});
