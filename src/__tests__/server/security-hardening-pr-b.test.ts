/**
 * Contratos estructurales del hardening de seguridad (PR-B).
 *
 * Verifica:
 *  - `scripts/seed-giveaway-platform.ts` YA requiere env var explícita
 *    para ejecutarse — alineado con el resto de scripts destructivos/DB.
 *  - `redeemShopItem` tiene documentado en JSDoc el modelo de concurrencia
 *    y la race condition teórica residual.
 *
 * Sin cambios de lógica: es hardening puramente defensivo. No toca DB,
 * balances, providers ni auth.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const SEED_PATH = 'scripts/seed-giveaway-platform.ts';
const ACTIONS_PATH = 'src/app/sorteos/plataforma/actions.ts';

describe('[hardening-pr-b] seed-giveaway-platform.ts requiere confirmación', () => {
  const src = read(SEED_PATH);

  it('define el token de confirmación exacto', () => {
    expect(src).toMatch(/const\s+CONFIRM_TOKEN\s*=\s*'I_ACCEPT_SEED'/);
  });

  it('la env var canónica es CONFIRM_SEED_GIVEAWAY_PLATFORM', () => {
    expect(src).toMatch(/process\.env\.CONFIRM_SEED_GIVEAWAY_PLATFORM/);
  });

  it('aborta con exit(1) si la env var no matchea', () => {
    expect(src).toMatch(/if\s*\(confirm\s*!==\s*CONFIRM_TOKEN\)/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it('muestra el comando exacto al usuario en el mensaje de error', () => {
    expect(src).toMatch(/CONFIRM_SEED_GIVEAWAY_PLATFORM=\$\{CONFIRM_TOKEN\}/);
  });

  it('menciona el archivo .env.local en el comando (paridad con el resto de scripts)', () => {
    expect(src).toMatch(/--env-file=\.env\.local/);
  });

  it('el guard corre ANTES del primer query a la DB', () => {
    // El check debe estar en las primeras líneas de main() — antes de
    // `db.query.platformMissions.findMany()`.
    const mainBody = src.match(/async function main\(\)[\s\S]*?^}/m)?.[0] ?? '';
    const confirmIdx = mainBody.indexOf('CONFIRM_TOKEN');
    const firstDbCall = mainBody.indexOf('db.query');
    expect(confirmIdx).toBeGreaterThanOrEqual(0);
    expect(firstDbCall).toBeGreaterThan(confirmIdx);
  });
});

describe('[hardening-pr-b] alineamiento con otros scripts destructivos', () => {
  it('cita en el comentario los otros seeds/cleanup con guards análogos', () => {
    const src = read(SEED_PATH);
    expect(src).toContain('CONFIRM_SEED_STEAM_REWARDS');
    expect(src).toContain('CONFIRM_CLEANUP_LEGACY_SHOP');
  });

  it('los 3 scripts protegidos usan el mismo patrón `CONFIRM_...=I_ACCEPT_...`', () => {
    for (const rel of [
      'scripts/seed-giveaway-platform.ts',
      'scripts/seed-socialpro-rewards-steam.ts',
      'scripts/cleanup-legacy-shop-items.ts',
    ]) {
      const src = read(rel);
      expect(src).toMatch(/CONFIRM_[A-Z_]+/);
      expect(src).toMatch(/I_ACCEPT_[A-Z_]+/);
      expect(src).toMatch(/process\.exit\(1\)/);
    }
  });
});

describe('[hardening-pr-b] redeemShopItem elimina la race condition', () => {
  const src = read(ACTIONS_PATH);
  const atomic = read('src/lib/giveaway-platform/atomicOperations.ts');

  it('delega el canje a una operación serializable', () => {
    expect(src).toMatch(/redeemAtomically/);
    expect(atomic).toMatch(/serializableRows/);
  });

  it('reserva stock solo si queda disponibilidad', () => {
    expect(atomic).toMatch(/UPDATE shop_items[\s\S]{0,300}si\.stock > 0/);
  });

  it('valida saldo y crea débito/canje en la misma sentencia', () => {
    expect(atomic).toMatch(/coalesce\(sum\(ct\.amount\), 0\)/);
    expect(atomic).toMatch(/INSERT INTO coin_transactions/);
    expect(atomic).toMatch(/INSERT INTO redemptions/);
  });

  it('usa requestKey como clave idempotente', () => {
    expect(src).toMatch(/requestKey/);
    expect(atomic).toMatch(/request_key/);
    expect(atomic).toMatch(/'redemption:' \|\|/);
  });
});

describe('[hardening-pr-b] conserva validaciones y notificación del canje', () => {
  const src = read(ACTIONS_PATH);

  it('mantiene prechecks de saldo, perfil y operación atómica', () => {
    expect(src).toMatch(/getCoinBalance\(sessionUser\.id\)/);
    expect(src).toMatch(/db\.query\.playerProfiles\.findFirst/);
    expect(src).toMatch(/redeemAtomically/);
  });

  it('el gate skin/trade URL sigue devolviendo code=trade_url_required', () => {
    expect(src).toMatch(/code:\s*'trade_url_required'/);
  });

  it('el email interno sigue siendo fire-and-forget para category=skin', () => {
    expect(src).toMatch(/sendRewardRedemptionEmail/);
    expect(src).toMatch(/if\s*\(redemption\.category === 'skin'\)\s*\{[\s\S]{0,1500}try\s*\{/);
  });
});
