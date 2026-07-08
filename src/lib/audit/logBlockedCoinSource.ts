import { assertAllowedCoinSource, ForbiddenCoinSourceError } from '@/lib/rewards/allowed-coin-sources';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';
import type { AuditAction } from '@/db/schema/giveawayAuditEvents';

/**
 * Ejecuta `assertAllowedCoinSource(source)` y, si lanza
 * `ForbiddenCoinSourceError`, registra un evento de auditoría con
 * `outcome: 'blocked'` antes de propagar la excepción.
 *
 * Reutiliza `action`s del set cerrado (`giveaway_participate`, `shop_redeem`,
 * `streak_claim`, `mission_claim`) — no introduce una `action` nueva.
 *
 * Errores distintos de `ForbiddenCoinSourceError` se propagan sin logging
 * (no son parte del contrato de fuentes prohibidas).
 *
 * Nota TS: `asserts source is AllowedCoinSource` NO se puede usar en
 * funciones async (limitación del compilador). El caller pasa un string
 * literal, no necesita narrowing.
 */
export async function assertAllowedCoinSourceOrLog(
  source: string,
  ctx: {
    readonly userId: string | null;
    readonly action: AuditAction;
    readonly refType?: string | null;
    readonly refId?: number | null;
  },
): Promise<void> {
  try {
    assertAllowedCoinSource(source);
  } catch (err) {
    if (err instanceof ForbiddenCoinSourceError) {
      await logGiveawayEvent({
        userId:  ctx.userId,
        action:  ctx.action,
        outcome: 'blocked',
        refType: ctx.refType ?? null,
        refId:   ctx.refId ?? null,
        metadata: {
          source,
          reason: 'forbidden_coin_source',
        },
      });
    }
    throw err;
  }
}
