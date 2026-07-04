/**
 * Contratos estructurales de Discord Misiones — Fase A.
 *
 * No arranca la app real. Verifica el shape del código, dependencias e
 * invariantes de seguridad leyendo el source-tree. Complementa los tests
 * de integración (que en Fase A no cubrimos porque requiere OAuth real).
 *
 * Reglas duras que estos tests fuerzan:
 *   1) Solo pedimos scopes mínimos: `identify guilds` (no `email` ni
 *      `messages.read` ni Bot scopes).
 *   2) El callback verifica el `state` cookie (protección CSRF).
 *   3) El token siempre se guarda cifrado — nunca en claro.
 *   4) La server action de verificación:
 *      - requiere sesión Better Auth,
 *      - hace rate limit por (missionId, userId),
 *      - registra intentos en `mission_verification_attempts`,
 *      - inserta claim y coin_transactions solo si el usuario está en la
 *        guild configurada,
 *      - jamás loguea tokens ni ciphertext.
 *   5) NO se persiste la lista de guilds del usuario (privacy).
 *   6) UI: DiscordMissionCard tiene los 3 CTAs canónicos (Abrir Discord,
 *      Conectar Discord, Verificar misión).
 *   7) Migración 0104 aplicada e indexada en _journal.json.
 *   8) Seed y doc existen.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

// Paths canónicos.
const P = {
  env: 'src/lib/env.ts',
  crypto: 'src/lib/crypto/token-encryption.ts',
  schemaMissions: 'src/db/schema/platformMissions.ts',
  schemaAccounts: 'src/db/schema/connectedSocialAccounts.ts',
  schemaIndex: 'src/db/schema/index.ts',
  constants: 'src/features/giveaway-platform/constants/discord-missions.ts',
  queryAccounts: 'src/lib/queries/connectedSocialAccounts.ts',
  routeConnect: 'src/app/api/auth/social/discord/connect/route.ts',
  routeCallback: 'src/app/api/auth/social/discord/callback/route.ts',
  routeDisconnect: 'src/app/api/auth/social/discord/disconnect/route.ts',
  action: 'src/app/sorteos/plataforma/discord-mission-action.ts',
  ui: 'src/features/giveaway-platform/components/DiscordMissionCard.tsx',
  grid: 'src/features/giveaway-platform/components/MissionsGrid.tsx',
  landing: 'src/features/giveaway-platform/components/PlatformCreatorLanding.tsx',
  css: 'src/app/sorteos/plataforma/platform-discord-mission.css',
  layout: 'src/app/sorteos/layout.tsx',
  seed: 'scripts/seed-discord-mission-zacketizor.ts',
  migration: 'drizzle/0104_discord_missions_fase_a.sql',
  journal: 'drizzle/meta/_journal.json',
  doc: 'docs/discord-mission-fase-a.md',
};

describe('[discord-fase-a] estructura de ficheros', () => {
  it.each(Object.entries(P))('existe %s', (_key, rel) => {
    expect(exists(rel)).toBe(true);
  });
});

describe('[discord-fase-a] env vars registradas', () => {
  const src = read(P.env);
  it.each([
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_OAUTH_REDIRECT_URL',
    'TOKEN_ENCRYPTION_KEY',
    'DISCORD_ZACKETIZOR_GUILD_ID',
    'DISCORD_ZACKETIZOR_INVITE_URL',
  ])('env declara %s', (name) => {
    expect(src).toContain(name);
  });
});

describe('[discord-fase-a] token-encryption.ts (AES-256-GCM)', () => {
  const src = read(P.crypto);

  it('usa AES-256-GCM con IV aleatorio y auth tag', () => {
    expect(src).toMatch(/aes-256-gcm/);
    // El IV se declara como constante y luego se pasa a randomBytes.
    expect(src).toMatch(/IV_LEN\s*=\s*12/);
    expect(src).toMatch(/randomBytes\s*\(\s*IV_LEN\s*\)/);
    expect(src).toMatch(/getAuthTag\s*\(/);
    expect(src).toMatch(/setAuthTag\s*\(/);
  });

  it('formato versionado v1:iv:ct:tag', () => {
    expect(src).toMatch(/v1:/);
  });

  it('exporta encrypt, decrypt e isTokenEncryptionConfigured', () => {
    expect(src).toMatch(/export\s+function\s+encrypt\b/);
    expect(src).toMatch(/export\s+function\s+decrypt\b/);
    expect(src).toMatch(/export\s+function\s+isTokenEncryptionConfigured\b/);
  });

  it('NO loguea plaintext ni ciphertext', () => {
    expect(src).not.toMatch(/console\.log\s*\([^)]*plaintext/);
    expect(src).not.toMatch(/console\.log\s*\([^)]*ciphertext/);
    // Ninguna llamada console.* dentro del módulo (por prudencia).
    expect(src).not.toMatch(/console\.(log|info|debug|warn|error)\s*\(/);
  });
});

describe('[discord-fase-a] schema platform_missions extendido', () => {
  const src = read(P.schemaMissions);
  it.each([
    ['provider', /provider:\s*varchar\('provider'/],
    ['target_id', /targetId:\s*varchar\('target_id'/],
    ['target_url', /targetUrl:\s*varchar\('target_url'/],
    ['verification_mode', /verificationMode:\s*varchar\('verification_mode'/],
  ])('columna %s declarada', (_col, re) => {
    expect(src).toMatch(re);
  });

  it('tabla mission_verification_attempts existe con outcome + índice', () => {
    expect(src).toMatch(/mission_verification_attempts/);
    expect(src).toMatch(/outcome:\s*varchar\('outcome'/);
    expect(src).toMatch(/mission_verif_user_mission_time_idx/);
  });
});

describe('[discord-fase-a] schema connected_social_accounts', () => {
  const src = read(P.schemaAccounts);

  it('UNIQUE (user_id, provider) y (provider, provider_user_id)', () => {
    expect(src).toMatch(/uniqueIndex\(['"]conn_social_user_provider_uq['"]\)\.on\(t\.userId,\s*t\.provider\)/);
    expect(src).toMatch(/uniqueIndex\(['"]conn_social_provider_user_uq['"]\)\.on\(t\.provider,\s*t\.providerUserId\)/);
  });

  it('columna disconnectedAt nullable (soft delete)', () => {
    expect(src).toMatch(/disconnectedAt.*timestamp/);
    // No debe tener .notNull() en el disconnectedAt
    expect(src).not.toMatch(/disconnectedAt[^,]*\.notNull\(\)/);
  });

  it('access_token se llama accessTokenEncrypted (nunca "plain")', () => {
    expect(src).toMatch(/accessTokenEncrypted/);
    expect(src).not.toMatch(/accessTokenPlain|access_token_raw/);
  });

  it('schema/index.ts reexporta connectedSocialAccounts', () => {
    const idx = read(P.schemaIndex);
    expect(idx).toMatch(/connectedSocialAccounts/);
  });
});

describe('[discord-fase-a] route /connect (inicio OAuth)', () => {
  const src = read(P.routeConnect);

  it('exige sesión Better Auth', () => {
    expect(src).toMatch(/auth\.api\.getSession/);
    expect(src).toMatch(/unauthenticated|401/);
  });

  it('genera state 32-byte hex y lo guarda en cookie httpOnly + sameSite=lax', () => {
    expect(src).toMatch(/randomBytes\s*\(\s*32\s*\)/);
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/sameSite:\s*['"]lax['"]/);
  });

  it('redirige a discord.com con response_type=code y scopes identify+guilds', () => {
    expect(src).toMatch(/discord\.com\/api\/oauth2\/authorize/);
    expect(src).toMatch(/response_type/);
    // Los scopes vienen del constant DISCORD_OAUTH_SCOPES = 'identify guilds'.
    expect(src).toMatch(/DISCORD_OAUTH_SCOPES/);
  });

  it('NO pide scopes sensibles (email, messages.read, bot, guilds.join)', () => {
    const constSrc = read(P.constants);
    expect(constSrc).toMatch(/DISCORD_OAUTH_SCOPES\s*=\s*['"]identify guilds['"]/);
    expect(constSrc).not.toMatch(/\bemail\b/);
    expect(constSrc).not.toMatch(/\bbot\b/);
    expect(constSrc).not.toMatch(/messages\.read/);
    expect(constSrc).not.toMatch(/guilds\.join/);
  });
});

describe('[discord-fase-a] route /callback', () => {
  const src = read(P.routeCallback);

  it('verifica state cookie contra querystring', () => {
    expect(src).toMatch(/sp_disc_oauth_state/);
    expect(src).toMatch(/state_mismatch|savedState\s*!==\s*state|savedState\s*!==?\s*state/);
  });

  it('borra la state cookie tras usarla (single use)', () => {
    expect(src).toMatch(/\.delete\(['"]sp_disc_oauth_state['"]\)/);
  });

  it('intercambia code → token con grant_type=authorization_code', () => {
    expect(src).toMatch(/grant_type/);
    expect(src).toMatch(/authorization_code/);
    expect(src).toMatch(/oauth2\/token/);
  });

  it('cifra el access_token antes de persistir', () => {
    expect(src).toMatch(/encrypt\s*\(\s*tokenData\.access_token\s*\)/);
    expect(src).toMatch(/upsertConnectedAccount/);
  });

  it('NO guarda refresh_token (Fase A)', () => {
    expect(src).not.toMatch(/refresh_token.*encrypt/);
  });

  it('NO persiste la lista de guilds del usuario', () => {
    expect(src).not.toMatch(/users\/@me\/guilds/);
  });
});

describe('[discord-fase-a] route /disconnect', () => {
  const src = read(P.routeDisconnect);

  it('requiere sesión y llama markAccountDisconnected', () => {
    expect(src).toMatch(/getSession/);
    expect(src).toMatch(/markAccountDisconnected/);
  });

  it('es POST, no GET (evita CSRF trivial vía img/link)', () => {
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).not.toMatch(/export\s+async\s+function\s+GET/);
  });
});

describe('[discord-fase-a] server action verifyDiscordMission', () => {
  const src = read(P.action);

  it('marca "use server"', () => {
    expect(src.trimStart()).toMatch(/^['"]use server['"]/);
  });

  it('exige sesión Better Auth', () => {
    expect(src).toMatch(/getSession/);
    expect(src).toMatch(/unauthenticated/);
  });

  it('bloquea si ya reclamó (mission_claims existente)', () => {
    expect(src).toMatch(/already_claimed/);
  });

  it('rate limit por (missionId, userId) — cutoff 30s', () => {
    expect(src).toMatch(/RATE_LIMIT_SECONDS\s*=\s*30/);
    expect(src).toMatch(/missionVerificationAttempts/);
  });

  it('exige provider="discord" y verificationMode="discord_guild_member"', () => {
    expect(src).toMatch(/mission\.provider\s*!==\s*['"]discord['"]/);
    expect(src).toMatch(/DISCORD_GUILD_MEMBER_MODE/);
  });

  it('descifra el token y llama a /users/@me/guilds sin cache', () => {
    expect(src).toMatch(/decrypt\s*\(\s*account\.accessTokenEncrypted\s*\)/);
    expect(src).toMatch(/users\/@me\/guilds/);
    expect(src).toMatch(/cache:\s*['"]no-store['"]/);
  });

  it('registra intento (recordAttempt) en cada outcome', () => {
    expect(src).toMatch(/recordAttempt\s*\(/);
    // Al menos success + los códigos de fallo canónicos.
    expect(src).toMatch(/['"]success['"]/);
    expect(src).toMatch(/['"]not_verified['"]/);
    expect(src).toMatch(/['"]api_error['"]/);
    expect(src).toMatch(/['"]token_expired['"]/);
    expect(src).toMatch(/['"]not_connected['"]/);
  });

  it('INSERT missionClaims usa onConflictDoNothing (anti race-condition)', () => {
    expect(src).toMatch(/onConflictDoNothing/);
  });

  it('INSERT coinTransactions con source="mision" y refId=missionId', () => {
    expect(src).toMatch(/coinTransactions/);
    expect(src).toMatch(/source:\s*['"]mision['"]/);
    expect(src).toMatch(/refId:\s*missionId/);
  });

  it('NO loguea tokens ni ciphertext', () => {
    expect(src).not.toMatch(/console\.[a-z]+\s*\([^)]*accessToken/);
    expect(src).not.toMatch(/console\.[a-z]+\s*\([^)]*access_token/);
    expect(src).not.toMatch(/console\.[a-z]+\s*\([^)]*Encrypted/);
  });
});

describe('[discord-fase-a] UI — DiscordMissionCard', () => {
  const src = read(P.ui);

  it('marca "use client"', () => {
    expect(src.trimStart()).toMatch(/^['"]use client['"]/);
  });

  it('CTA "Conectar Discord" apunta al endpoint /api/auth/social/discord/connect', () => {
    expect(src).toMatch(/\/api\/auth\/social\/discord\/connect/);
    expect(src).toMatch(/Conectar Discord/);
  });

  it('CTA "Verificar misión" llama a la server action verifyDiscordMission', () => {
    expect(src).toMatch(/verifyDiscordMission/);
    expect(src).toMatch(/Verificar misión/);
  });

  it('CTA "Abrir Discord" solo se renderiza si hay inviteUrl', () => {
    expect(src).toMatch(/inviteUrl \?/);
    expect(src).toMatch(/Abrir Discord/);
  });

  it('nota de privacidad visible en el card', () => {
    expect(src).toMatch(/No leemos mensajes/);
  });
});

describe('[discord-fase-a] MissionsGrid wiring Discord', () => {
  const src = read(P.grid);

  it('renderiza DiscordMissionCard cuando hay misión provider="discord"', () => {
    expect(src).toMatch(/DiscordMissionCard/);
    expect(src).toMatch(/provider === ['"]discord['"]/);
  });

  it('el placeholder YouTube sigue rendered', () => {
    expect(src).toMatch(/<YoutubeMissionsPlaceholder/);
  });
});

describe('[discord-fase-a] Landing pasa discord prop y hace fetch cuenta conectada', () => {
  const src = read(P.landing);
  it('llama getConnectedAccount con provider "discord"', () => {
    expect(src).toMatch(/getConnectedAccount\(userId,\s*['"]discord['"]\)/);
  });
  it('pasa discord prop a <MissionsGrid />', () => {
    expect(src).toMatch(/<MissionsGrid[\s\S]*discord=\{/);
  });
});

describe('[discord-fase-a] CSS scoped bajo .giveaway-platform', () => {
  const src = read(P.css);
  const layout = read(P.layout);

  it('todas las reglas scoped', () => {
    const rules = src.match(/^\.\S+/gm) ?? [];
    for (const rule of rules) {
      expect(rule).toMatch(/^\.giveaway-platform/);
    }
  });

  it('el layout importa el CSS Discord', () => {
    expect(layout).toMatch(/platform-discord-mission\.css/);
  });
});

describe('[discord-fase-a] migración 0104 registrada', () => {
  const journalRaw = read(P.journal);
  const journal = JSON.parse(journalRaw);
  const entries: { idx: number; tag: string }[] = journal.entries ?? [];

  it('journal tiene entry 0104_discord_missions_fase_a', () => {
    const hit = entries.find((e) => e.tag === '0104_discord_missions_fase_a');
    expect(hit).toBeDefined();
    expect(hit?.idx).toBe(104);
  });

  it('SQL crea tablas y columnas Fase A (idempotente)', () => {
    const sql = read(P.migration);
    // La migración es idempotente para tolerar estado parcial en prod.
    expect(sql).toMatch(/ALTER TABLE\s+"?platform_missions"?\s+ADD COLUMN\s+IF NOT EXISTS\s+"?provider"?/i);
    expect(sql).toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+"?connected_social_accounts"?/i);
    expect(sql).toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+"?mission_verification_attempts"?/i);
  });
});

describe('[discord-fase-a] seed script con guard', () => {
  const src = read(P.seed);
  it('requiere CONFIRM_SEED_DISCORD_MISSION=I_ACCEPT_DISCORD_MISSION', () => {
    expect(src).toMatch(/CONFIRM_SEED_DISCORD_MISSION/);
    expect(src).toMatch(/I_ACCEPT_DISCORD_MISSION/);
  });
  it('provider="discord", verificationMode=discord_guild_member', () => {
    expect(src).toMatch(/provider:\s*['"]discord['"]/);
    expect(src).toMatch(/DISCORD_GUILD_MEMBER_MODE/);
  });
});

describe('[discord-fase-a] doc de setup existe y tiene secciones canónicas', () => {
  const src = read(P.doc);
  it.each([
    'Discord Developer Portal',
    'Redirect URI',
    'Guild ID',
    'Invite URL',
    'Fase A',
  ])('menciona "%s"', (needle) => {
    expect(src).toMatch(new RegExp(needle.replace(/\s+/g, '\\s+'), 'i'));
  });
});
