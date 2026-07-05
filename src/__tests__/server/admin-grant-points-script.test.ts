/**
 * Contratos del script manual de concesión de puntos.
 *
 * `scripts/admin-grant-points.ts` es una herramienta interna dev/staff:
 *  - Requiere env var explícita de confirmación.
 *  - Bloqueada en CI / producción.
 *  - Argumentos obligatorios: (--steam-id | --user-id), --amount, --reason.
 *  - Valida rangos (>= 1, <= 100_000).
 *  - Inserta UNA fila en `coin_transactions` con source='admin'.
 *  - NO toca redemptions, shop_items, player_profiles, ni actualiza
 *    balances cacheados.
 *
 * Estos tests son estructurales (regex sobre el fuente). Ejecutar el
 * script contra una DB real queda fuera de scope de la suite unitaria.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const SCRIPT = 'scripts/admin-grant-points.ts';

describe('[admin-grant-points] archivo existe con estructura mínima', () => {
  it('scripts/admin-grant-points.ts existe y no está vacío', () => {
    const p = path.join(ROOT, SCRIPT);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(2000);
  });

  it('define main() async y process.exit(0) al terminar', () => {
    const src = read(SCRIPT);
    expect(src).toMatch(/async function main\(\)/);
    expect(src).toMatch(/process\.exit\(0\)/);
  });
});

describe('[admin-grant-points] guards de entorno', () => {
  const src = read(SCRIPT);

  it('detecta CI, VERCEL, GITHUB_ACTIONS y NODE_ENV=production', () => {
    expect(src).toMatch(/CI[\s\S]{0,80}'true'/);
    expect(src).toMatch(/VERCEL[\s\S]{0,80}'1'/);
    expect(src).toMatch(/GITHUB_ACTIONS/);
    expect(src).toMatch(/NODE_ENV[\s\S]{0,80}'production'/);
  });

  it('aborta con exit(1) si detecta CI/prod', () => {
    expect(src).toMatch(/detectCiOrProd\(\)[\s\S]{0,300}process\.exit\(1\)/);
  });
});

describe('[admin-grant-points] token de confirmación explícito', () => {
  const src = read(SCRIPT);

  it('define CONFIRM_TOKEN = "I_ACCEPT_GRANT_POINTS"', () => {
    expect(src).toMatch(/const\s+CONFIRM_TOKEN\s*=\s*'I_ACCEPT_GRANT_POINTS'/);
  });

  it('la env var es CONFIRM_ADMIN_GRANT_POINTS', () => {
    expect(src).toMatch(/process\.env\.CONFIRM_ADMIN_GRANT_POINTS/);
  });

  it('aborta con exit(1) si la env no matchea', () => {
    expect(src).toMatch(/if\s*\(confirm\s*!==\s*CONFIRM_TOKEN\)[\s\S]{0,400}process\.exit\(1\)/);
  });

  it('muestra el comando exacto en el mensaje de error', () => {
    expect(src).toMatch(/CONFIRM_ADMIN_GRANT_POINTS=\$\{CONFIRM_TOKEN\}/);
    expect(src).toMatch(/--env-file=\.env\.local/);
  });
});

describe('[admin-grant-points] parseo y validación de args', () => {
  const src = read(SCRIPT);

  it('acepta --steam-id y --user-id (mutuamente exclusivos)', () => {
    expect(src).toMatch(/steamId\s*&&\s*userId/);
    expect(src).toMatch(/Debes pasar --steam-id o --user-id/);
  });

  it('exige --amount y --reason', () => {
    expect(src).toMatch(/Falta --amount/);
    expect(src).toMatch(/Falta --reason/);
  });

  it('rechaza amount <= 0 (MIN_AMOUNT = 1)', () => {
    expect(src).toMatch(/const\s+MIN_AMOUNT\s*=\s*1/);
    expect(src).toMatch(/amount\s*<\s*MIN_AMOUNT/);
  });

  it('rechaza amount > MAX_GRANT (100_000)', () => {
    expect(src).toMatch(/const\s+MAX_GRANT\s*=\s*100_?000/);
    expect(src).toMatch(/amount\s*>\s*MAX_GRANT/);
  });

  it('reason limitado a 200 chars (schema varchar 200)', () => {
    expect(src).toMatch(/const\s+REASON_MAX_LEN\s*=\s*200/);
    expect(src).toMatch(/reason\.length\s*>\s*REASON_MAX_LEN/);
  });

  it('valida amount como entero (Number.parseInt + Number.isFinite)', () => {
    expect(src).toMatch(/Number\.parseInt\(amountRaw,\s*10\)/);
    expect(src).toMatch(/Number\.isFinite\(amount\)/);
  });
});

describe('[admin-grant-points] inserta en el ledger, no toca balances directos', () => {
  const src = read(SCRIPT);

  it('inserta UNA fila en coin_transactions con source="admin"', () => {
    expect(src).toMatch(
      /db\s*\.insert\(coinTransactions\)[\s\S]{0,400}source:\s*'admin'/,
    );
  });

  it('la fila insertada usa el reason como concept', () => {
    expect(src).toMatch(/concept:\s*args\.reason/);
  });

  it('amount insertado es POSITIVO (args.amount, no negado)', () => {
    expect(src).toMatch(/amount:\s*args\.amount(?![-\s]*[*-])/);
  });

  it('userId destino sale de la DB (no del cliente/args directamente)', () => {
    // El args puede traer --user-id, pero el script SIEMPRE resuelve
    // via `resolveTargetUser` que consulta `user` / `player_profiles`.
    expect(src).toMatch(/resolveTargetUser/);
    expect(src).toMatch(/target\.userId/);
    expect(src).toMatch(/userId:\s*target\.userId/);
  });

  it('NO hace UPDATE sobre balances ni tablas de saldo cacheado', () => {
    // El modelo es ledger append-only. No debe existir ninguna forma
    // de UPDATE a shopItems/redemptions/playerProfiles/user desde aquí.
    expect(src).not.toMatch(/db\s*\.update\(shopItems/);
    expect(src).not.toMatch(/db\s*\.update\(redemptions/);
    expect(src).not.toMatch(/db\s*\.update\(playerProfiles/);
    expect(src).not.toMatch(/db\s*\.update\(user\b/);
  });

  it('NO borra filas de ninguna tabla', () => {
    expect(src).not.toMatch(/db\s*\.delete/);
  });
});

describe('[admin-grant-points] snapshot antes/después para auditoría', () => {
  const src = read(SCRIPT);

  it('calcula getBalance antes y después del INSERT', () => {
    expect(src).toMatch(/getBalance/);
    // Snapshot antes.
    expect(src).toMatch(/const\s+before\s*=\s*await getBalance/);
    // Verificación post.
    expect(src).toMatch(/const\s+after\s*=\s*await getBalance/);
  });

  it('imprime resumen: usuario, steam id, user id, cantidad, reason, saldo ant/post', () => {
    expect(src).toMatch(/Usuario:/);
    expect(src).toMatch(/Steam ID:/);
    expect(src).toMatch(/User ID:/);
    expect(src).toMatch(/Cantidad:/);
    expect(src).toMatch(/Reason:/);
    expect(src).toMatch(/Saldo ant/);
    expect(src).toMatch(/Saldo post/);
  });
});

describe('[admin-grant-points] no contiene secrets hardcodeados', () => {
  const src = read(SCRIPT);

  it('no lleva claves ni cadenas Steam-token con "secret"/"key" literales', () => {
    expect(src).not.toMatch(/DATABASE_URL\s*=\s*['"]/);
    expect(src).not.toMatch(/RESEND_API_KEY\s*=\s*['"]/);
    expect(src).not.toMatch(/STEAM_API_KEY\s*=\s*['"]/);
    expect(src).not.toMatch(/BETTER_AUTH_SECRET\s*=\s*['"]/);
  });

  it('no imprime la env var de confirmación ni valores sensibles', () => {
    // Debe usar `CONFIRM_TOKEN` como placeholder en el mensaje de error
    // pero NUNCA loguear `process.env.DATABASE_URL` u otros secretos.
    expect(src).not.toMatch(/console\.\w+\([^)]*process\.env\.(?!CONFIRM_ADMIN_GRANT_POINTS\b)/);
  });
});

describe('[admin-grant-points] alineado con el patrón del resto de scripts', () => {
  it('usa el mismo estilo CONFIRM_...=I_ACCEPT_... que los otros scripts destructivos/DB', () => {
    const src = read(SCRIPT);
    expect(src).toMatch(/CONFIRM_ADMIN_GRANT_POINTS/);
    expect(src).toMatch(/I_ACCEPT_GRANT_POINTS/);
  });

  it('los 4 scripts protegidos siguen el mismo patrón', () => {
    for (const rel of [
      'scripts/seed-giveaway-platform.ts',
      'scripts/seed-socialpro-rewards-steam.ts',
      'scripts/cleanup-legacy-shop-items.ts',
      'scripts/admin-grant-points.ts',
    ]) {
      const src = read(rel);
      expect(src).toMatch(/CONFIRM_[A-Z_]+/);
      expect(src).toMatch(/I_ACCEPT_[A-Z_]+/);
      expect(src).toMatch(/process\.exit\(1\)/);
    }
  });
});
