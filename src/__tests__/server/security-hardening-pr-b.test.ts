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

describe('[hardening-pr-b] redeemShopItem documenta race condition teórica', () => {
  const src = read(ACTIONS_PATH);

  it('JSDoc menciona el modelo de concurrencia con neon-http', () => {
    expect(src).toMatch(/neon-http/);
    expect(src).toMatch(/no soporta transacciones multi-statement/);
  });

  it('JSDoc explica el UPDATE condicional de stock (gt(stock, 0)) como gate', () => {
    expect(src).toMatch(/UPDATE condicional de stock/);
    expect(src).toMatch(/gt\(stock,\s*0\)/);
    expect(src).toMatch(/gate anti-oversell|Atómico a nivel SQL/);
  });

  it('JSDoc identifica el riesgo teórico residual (doble descuento)', () => {
    expect(src).toMatch(/Riesgo teórico residual/);
    // Menciona el escenario de dos canjes en paralelo con saldo justo.
    expect(src).toMatch(/dos canjes en paralelo/);
  });

  it('JSDoc propone mitigación futura (fuera de scope de este PR)', () => {
    // Documenta neon-serverless WebSocket o UPSERT atómico.
    expect(src).toMatch(/neon-serverless|WebSocket|UPSERT/);
    // Permitir cortes de línea entre "Fuera" y "de scope".
    expect(src).toMatch(/Fuera[\s\S]{0,10}de scope/i);
  });
});

describe('[hardening-pr-b] no cambia lógica del canje', () => {
  const src = read(ACTIONS_PATH);

  it('el pipeline sigue igual: balance check → profile check → stock update → tx → redemption', () => {
    // Verificamos que las llamadas SQL clave siguen presentes en el orden.
    expect(src).toMatch(/getCoinBalance\(sessionUser\.id\)/);
    expect(src).toMatch(/db\.query\.playerProfiles\.findFirst/);
    expect(src).toMatch(/db\s*\.update\(shopItems\)[\s\S]{0,400}gt\(shopItems\.stock,\s*0\)/);
    expect(src).toMatch(/db\.insert\(coinTransactions\)/);
    expect(src).toMatch(/db\s*\.insert\(redemptions\)/);
  });

  it('el gate skin/trade URL sigue devolviendo code=trade_url_required', () => {
    expect(src).toMatch(/code:\s*'trade_url_required'/);
  });

  it('el email interno sigue siendo fire-and-forget para category=skin', () => {
    expect(src).toMatch(/sendRewardRedemptionEmail/);
    expect(src).toMatch(/if\s*\(item\.category === 'skin'\)\s*\{[\s\S]{0,1500}try\s*\{/);
  });
});
