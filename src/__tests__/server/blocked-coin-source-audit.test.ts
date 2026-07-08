/**
 * Sorteos Fase 1 PR2 — trazabilidad de intentos bloqueados por
 * `assertAllowedCoinSource`.
 *
 * `assertAllowedCoinSourceOrLog(source, ctx)` reutiliza el action del set
 * cerrado y añade outcome='blocked'. NO añade nueva action al schema.
 * Sin migración.
 */

const mockLogGiveawayEvent = jest.fn();

jest.mock('@/lib/audit/logGiveawayEvent', () => ({
  logGiveawayEvent: (...args: unknown[]) => mockLogGiveawayEvent(...args),
}));

import { assertAllowedCoinSourceOrLog } from '@/lib/audit/logBlockedCoinSource';
import { ForbiddenCoinSourceError } from '@/lib/rewards/allowed-coin-sources';

beforeEach(() => {
  mockLogGiveawayEvent.mockClear();
});

describe('assertAllowedCoinSourceOrLog', () => {
  it('no lanza y NO loguea cuando source es allowed', async () => {
    await expect(
      assertAllowedCoinSourceOrLog('sorteo', {
        userId: 'user-1',
        action: 'giveaway_participate',
      }),
    ).resolves.toBeUndefined();
    expect(mockLogGiveawayEvent).not.toHaveBeenCalled();
  });

  it('para cada source allowed (racha, mision, sorteo, tienda, admin) no loguea', async () => {
    const sources = ['racha', 'mision', 'sorteo', 'tienda', 'admin'] as const;
    for (const s of sources) {
      await assertAllowedCoinSourceOrLog(s, { userId: null, action: 'shop_redeem' });
    }
    expect(mockLogGiveawayEvent).not.toHaveBeenCalled();
  });

  it('lanza ForbiddenCoinSourceError cuando source no está permitida', async () => {
    await expect(
      assertAllowedCoinSourceOrLog('apuesta', {
        userId: 'user-1',
        action: 'giveaway_participate',
        refType: 'giveaway',
        refId: 42,
      }),
    ).rejects.toBeInstanceOf(ForbiddenCoinSourceError);
  });

  it('loguea con outcome="blocked" al bloquear', async () => {
    await expect(
      assertAllowedCoinSourceOrLog('apuesta', {
        userId: 'user-1',
        action: 'giveaway_participate',
        refType: 'giveaway',
        refId: 42,
      }),
    ).rejects.toBeDefined();
    expect(mockLogGiveawayEvent).toHaveBeenCalledTimes(1);
    const call = mockLogGiveawayEvent.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.outcome).toBe('blocked');
    expect(call.userId).toBe('user-1');
    expect(call.action).toBe('giveaway_participate');
    expect(call.refType).toBe('giveaway');
    expect(call.refId).toBe(42);
    const metadata = call.metadata as Record<string, unknown>;
    expect(metadata.source).toBe('apuesta');
    expect(metadata.reason).toBe('forbidden_coin_source');
  });

  it('reutiliza actions existentes (giveaway_participate, shop_redeem, streak_claim, mission_claim)', async () => {
    const cases = [
      { action: 'giveaway_participate' as const, source: 'jackpot' },
      { action: 'shop_redeem' as const, source: 'wager' },
      { action: 'streak_claim' as const, source: 'ruleta' },
      { action: 'mission_claim' as const, source: 'case_battle' },
    ];
    for (const c of cases) {
      mockLogGiveawayEvent.mockClear();
      await expect(
        assertAllowedCoinSourceOrLog(c.source, { userId: 'u', action: c.action }),
      ).rejects.toBeDefined();
      const call = mockLogGiveawayEvent.mock.calls[0]![0] as Record<string, unknown>;
      expect(call.action).toBe(c.action);
      expect(call.outcome).toBe('blocked');
    }
  });

  it('no filtra source en la metadata (queremos ver la string que intentó pasar)', async () => {
    await expect(
      assertAllowedCoinSourceOrLog('partner_deposit', { userId: null, action: 'shop_redeem' }),
    ).rejects.toBeDefined();
    const call = mockLogGiveawayEvent.mock.calls[0]![0] as Record<string, unknown>;
    const metadata = call.metadata as Record<string, unknown>;
    expect(metadata.source).toBe('partner_deposit');
  });
});
