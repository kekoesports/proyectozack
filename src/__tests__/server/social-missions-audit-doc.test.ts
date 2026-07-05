/**
 * Contratos del documento de auditoría de misiones sociales
 * (Twitch · Kick · Discord). YouTube queda fuera de este doc — está
 * en `docs/youtube-missions-verification.md` y aparcado.
 *
 * Doc-only. No implementa nada funcional. Verifica que:
 *  - El documento existe con estructura mínima.
 *  - Cubre las 3 plataformas (Discord, Twitch, Kick).
 *  - Identifica el scope correcto en cada una.
 *  - Marca Kick como bloqueado por API (no scraping).
 *  - Recomienda Discord primero.
 *  - No modifica env, schema, auth ni ninguna ruta funcional.
 *  - No filtra secretos de ejemplo.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const DOC = 'docs/social-missions-twitch-kick-discord.md';

describe('[social-missions-audit] documento existe', () => {
  it('docs/social-missions-twitch-kick-discord.md existe y no está vacío', () => {
    const p = path.join(ROOT, DOC);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(5_000);
  });

  it('está marcado como auditoría, sin MVP funcional', () => {
    const doc = read(DOC);
    expect(doc).toMatch(/NO hay MVP funcional/);
    expect(doc).toMatch(/Auditoría técnica/i);
  });

  it('deja YouTube fuera del scope de este doc', () => {
    const doc = read(DOC);
    // Se referencia el otro doc para YouTube (aparcado), no se re-audita.
    expect(doc).toMatch(/YouTube[\s\S]{0,150}aparcad[oa]/i);
    expect(doc).toMatch(/youtube-missions-verification\.md/);
  });
});

describe('[social-missions-audit] cubre Discord con detalle', () => {
  const doc = read(DOC);

  it('sección Discord identifica scope OAuth `guilds`', () => {
    expect(doc).toMatch(/Discord[\s\S]{0,2000}scope OAuth.{0,20}`guilds`/);
  });

  it('menciona endpoint `GET /users/@me/guilds` y la alternativa `guilds.members.read`', () => {
    expect(doc).toContain('GET /users/@me/guilds');
    expect(doc).toMatch(/guilds\.members\.read/);
  });

  it('confirma que no requiere bot en el servidor', () => {
    expect(doc).toMatch(/no requiere bot|no necesita bot|sin necesidad de bot/i);
  });

  it('lista env vars necesarias para Discord', () => {
    expect(doc).toContain('DISCORD_CLIENT_ID');
    expect(doc).toContain('DISCORD_CLIENT_SECRET');
    expect(doc).toContain('DISCORD_OAUTH_REDIRECT_URL');
  });
});

describe('[social-missions-audit] cubre Twitch con detalle', () => {
  const doc = read(DOC);

  it('identifica endpoint `GET /helix/channels/followed` con scope `user:read:follows`', () => {
    expect(doc).toContain('/helix/channels/followed');
    expect(doc).toMatch(/user:read:follows/);
  });

  it('separa follow (viable) de subscription (restricted scope)', () => {
    expect(doc).toMatch(/follow[\s\S]{0,300}subscription|subs de pago/i);
    expect(doc).toMatch(/user:read:subscriptions[\s\S]{0,120}restricted|scope.{0,30}restricted/i);
  });

  it('menciona que TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET ya existen en el repo', () => {
    expect(doc).toMatch(/TWITCH_CLIENT_ID[\s\S]{0,300}ya (en |existen|est[áa]n?)/i);
  });

  it('lista rate limit 800 puntos/minuto de Twitch', () => {
    expect(doc).toMatch(/800\s*(puntos|points).{0,30}minuto|min/i);
  });
});

describe('[social-missions-audit] Kick — bloqueado por API', () => {
  const doc = read(DOC);

  it('confirma que no hay endpoint público para verificar follow en Kick', () => {
    expect(doc).toMatch(/NO existe endpoint|no hay endpoint|no existe.{0,60}follow/i);
  });

  it('lista los únicos endpoints públicos actuales de Kick (channels GET/PATCH)', () => {
    expect(doc).toMatch(/GET\s*\/public\/v1\/channels/);
    expect(doc).toMatch(/PATCH\s*\/public\/v1\/channels/);
  });

  it('marca Kick como "aparcar" y menciona monitorizar el changelog', () => {
    expect(doc).toMatch(/Aparcar|aparcar/);
    expect(doc).toMatch(/KickDevDocs|changelog/);
  });

  it('prohíbe scraping runtime como alternativa', () => {
    expect(doc).toMatch(/no scraping|scraping[\s\S]{0,120}prohibid/i);
  });
});

describe('[social-missions-audit] modelo de datos común propuesto', () => {
  const doc = read(DOC);

  it('propone tabla `connected_social_accounts` con tokens cifrados', () => {
    expect(doc).toContain('connected_social_accounts');
    expect(doc).toMatch(/access_token_encrypted/);
    expect(doc).toMatch(/refresh_token_encrypted/);
  });

  it('propone ampliación de platform_missions con provider/target_id/verification_mode', () => {
    expect(doc).toMatch(/ALTER TABLE platform_missions/);
    expect(doc).toMatch(/target_id/);
    expect(doc).toMatch(/verification_mode/);
    expect(doc).toMatch(/provider/);
  });

  it('reutiliza el ledger existente (coin_transactions source=mision, mission_claims UNIQUE)', () => {
    expect(doc).toMatch(/coin_transactions.{0,80}source.{0,10}(=|:)?\s*['"]?mision/);
    expect(doc).toMatch(/mission_claims.{0,80}UNIQUE/);
  });
});

describe('[social-missions-audit] recomendación final: Discord primero, Kick aparcado', () => {
  const doc = read(DOC);

  it('recomienda implementar Discord primero', () => {
    expect(doc).toMatch(/Discord primero|Implementar primero.{0,80}Discord|Discord.{0,10}fase A/i);
  });

  it('recomienda Twitch en segundo lugar', () => {
    expect(doc).toMatch(/Twitch segundo|Twitch.{0,10}fase B/i);
  });

  it('mantiene Kick aparcado con seguimiento', () => {
    expect(doc).toMatch(/Kick aparcad|Kick.{0,10}fase C/i);
  });

  it('lista qué NO debemos hacer (scraping, mocks falsos, tokens en claro)', () => {
    expect(doc).toMatch(/No hacer scraping|no scraping runtime/i);
    expect(doc).toMatch(/no inventar mocks|mocks que parezcan|verificación falsa/i);
    expect(doc).toMatch(/no guardar tokens sin cifrado|tokens.{0,30}cifrad/i);
  });
});

describe('[social-missions-audit] fuentes citadas', () => {
  const doc = read(DOC);

  it('enlaza documentación oficial de Twitch, Discord y Kick', () => {
    expect(doc).toMatch(/dev\.twitch\.tv\/docs\/api\/reference/);
    expect(doc).toMatch(/docs\.discord\.com|discord\.com\/developers\/docs/);
    expect(doc).toMatch(/KickEngineering\/KickDevDocs|docs\.kick\.com/);
  });
});

/**
 * A partir de Fase A Discord:
 *   - Discord SÍ se implementa (env vars, schema, tabla, rutas OAuth,
 *     verificación).
 *   - Twitch y Kick siguen fuera de scope funcional.
 *   - auth.ts no añade plugins de user OAuth para ninguno (Discord se
 *     integra vía rutas propias `/api/auth/social/discord/*`, no vía
 *     plugin de Better Auth).
 */
describe('[social-missions-audit] Fase A Discord + Fase B Twitch implementadas, Kick aún no', () => {
  it('env.ts añade DISCORD_* y TWITCH_* Fase B y TOKEN_ENCRYPTION_KEY, no Kick', () => {
    const envSrc = read('src/lib/env.ts');
    expect(envSrc).toContain('DISCORD_CLIENT_ID');
    expect(envSrc).toContain('TWITCH_OAUTH_REDIRECT_URL');
    expect(envSrc).toContain('TOKEN_ENCRYPTION_KEY');
    // Kick sigue fuera de scope.
    expect(envSrc).not.toContain('KICK_CLIENT_ID');
  });

  it('platform_missions incluye provider/target_id/verification_mode (Fase A)', () => {
    const schema = read('src/db/schema/platformMissions.ts');
    expect(schema).toMatch(/provider:\s*varchar\('provider'/);
    expect(schema).toMatch(/targetId:\s*varchar\('target_id'/);
    expect(schema).toMatch(/verificationMode:\s*varchar\('verification_mode'/);
  });

  it('existe tabla connected_social_accounts en schema', () => {
    const schemaDir = path.join(ROOT, 'src/db/schema');
    const files = fs.readdirSync(schemaDir);
    const found = files.some((f) =>
      fs.readFileSync(path.join(schemaDir, f), 'utf-8').includes('connected_social_accounts')
    );
    expect(found).toBe(true);
  });

  it('existen rutas /api/auth/social/{discord,twitch}/{connect,callback,disconnect}', () => {
    for (const rel of [
      'src/app/api/auth/social/discord/connect/route.ts',
      'src/app/api/auth/social/discord/callback/route.ts',
      'src/app/api/auth/social/discord/disconnect/route.ts',
      'src/app/api/auth/social/twitch/connect/route.ts',
      'src/app/api/auth/social/twitch/callback/route.ts',
      'src/app/api/auth/social/twitch/disconnect/route.ts',
    ]) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    }
  });

  it('NO existen rutas OAuth de usuario para Kick (sigue aparcado — API no expone follow verificable)', () => {
    const kickDir = path.join(ROOT, 'src/app/api/auth/social/kick');
    expect(fs.existsSync(kickDir)).toBe(false);
  });

  it('src/lib/auth.ts NO añade plugins de user OAuth para Discord/Twitch/Kick', () => {
    // Discord Fase A se implementa como rutas propias, no como plugin de
    // Better Auth. Esto lo mantenemos para no meter dependencias nuevas.
    const authSrc = read('src/lib/auth.ts');
    expect(authSrc).not.toMatch(/discordPlugin/);
    expect(authSrc).not.toMatch(/kickPlugin/);
    expect(authSrc).not.toMatch(/twitch.*OAuth.*(user|player)/i);
  });

  // Nota: la actualización del copy de /sorteos/privacidad (mencionar
  // Discord y Twitch como providers de OAuth) queda como PR separado
  // antes del go-live real. Fase A/B pueden vivir en preview/staging
  // sin tocar el copy legal público.
});

describe('[social-missions-audit] no filtra secretos de ejemplo', () => {
  const doc = read(DOC);

  it('no incluye Client Secrets ni tokens literales', () => {
    // Discord client secret tiene forma parecida a un hash.
    expect(doc).not.toMatch(/mfa\.[A-Za-z0-9_-]{40,}/);
    // Twitch client secret suele ser base32/hex de 30-40 chars.
    // No pegamos ninguno.
    expect(doc).not.toMatch(/access_token[\s"']*=[\s"']*[A-Za-z0-9]{40,}/);
    // Ninguna cadena que parezca un JWT.
    expect(doc).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\./);
  });
});
