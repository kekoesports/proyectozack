/**
 * Contratos estructurales de Twitch Misiones — Fase B.
 *
 * No arranca la app real. Verifica el shape del código, dependencias e
 * invariantes de seguridad leyendo el source-tree. Complementa los tests
 * de integración (que en Fase B no cubrimos porque requiere OAuth real).
 *
 * Reglas duras que estos tests fuerzan:
 *   1) Solo pedimos scope mínimo: `user:read:follows`. Sin subscriptions.
 *   2) El callback verifica el `state` cookie (protección CSRF).
 *   3) El token siempre se guarda cifrado — nunca en claro.
 *   4) NO se persiste `refresh_token` en Fase B (política acordada).
 *   5) La server action de verificación:
 *      - requiere sesión Better Auth,
 *      - hace rate limit por (missionId, userId),
 *      - registra intentos en `mission_verification_attempts`,
 *      - inserta claim y coin_transactions solo si el usuario sigue el
 *        broadcaster configurado,
 *      - jamás loguea tokens ni ciphertext.
 *   6) NO se persiste la lista de follows del usuario (privacy).
 *   7) UI: TwitchMissionCard tiene los CTAs canónicos (Abrir Twitch,
 *      Conectar / Reconectar Twitch, Verificar misión).
 *   8) Card oculta si faltan env vars.
 *   9) Seed y doc existen.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

const P = {
  env: 'src/lib/env.ts',
  constants: 'src/features/giveaway-platform/constants/twitch-missions.ts',
  routeConnect: 'src/app/api/auth/social/twitch/connect/route.ts',
  routeCallback: 'src/app/api/auth/social/twitch/callback/route.ts',
  routeDisconnect: 'src/app/api/auth/social/twitch/disconnect/route.ts',
  action: 'src/app/sorteos/plataforma/twitch-mission-action.ts',
  ui: 'src/features/giveaway-platform/components/TwitchMissionCard.tsx',
  grid: 'src/features/giveaway-platform/components/MissionsGrid.tsx',
  landing: 'src/features/giveaway-platform/components/PlatformCreatorLanding.tsx',
  css: 'src/app/sorteos/plataforma/platform-twitch-mission.css',
  layout: 'src/app/sorteos/layout.tsx',
  seed: 'scripts/seed-twitch-mission-zacketizor.ts',
  doc: 'docs/twitch-mission-fase-b.md',
};

describe('[twitch-fase-b] estructura de ficheros', () => {
  it.each(Object.entries(P))('existe %s', (_key, rel) => {
    expect(exists(rel)).toBe(true);
  });
});

describe('[twitch-fase-b] env vars registradas', () => {
  const src = read(P.env);
  it.each([
    'TWITCH_CLIENT_ID',
    'TWITCH_CLIENT_SECRET',
    'TWITCH_OAUTH_REDIRECT_URL',
    'TWITCH_ZACKETIZOR_BROADCASTER_ID',
    'TWITCH_ZACKETIZOR_CHANNEL_URL',
  ])('env declara %s', (name) => {
    expect(src).toContain(name);
  });

  it('reutiliza TOKEN_ENCRYPTION_KEY (no crea uno específico de Twitch)', () => {
    expect(src).toContain('TOKEN_ENCRYPTION_KEY');
    expect(src).not.toContain('TWITCH_TOKEN_ENCRYPTION_KEY');
  });
});

describe('[twitch-fase-b] constants', () => {
  const src = read(P.constants);

  it('scope mínimo user:read:follows — sin subscriptions', () => {
    expect(src).toMatch(/TWITCH_OAUTH_SCOPES\s*=\s*['"]user:read:follows['"]/);
    // NO pedir subscriptions ni chat/messages scopes.
    expect(src).not.toMatch(/user:read:subscriptions/);
    expect(src).not.toMatch(/channel:read:subscriptions/);
    expect(src).not.toMatch(/chat:read/);
    expect(src).not.toMatch(/chat:edit/);
  });

  it('verificationMode canónico', () => {
    expect(src).toMatch(/TWITCH_FOLLOW_CHANNEL_MODE\s*=\s*['"]twitch_follow_channel['"]/);
  });

  it('helpers isTwitchOauthConfigured + getTwitchMissionTarget presentes', () => {
    expect(src).toMatch(/export\s+function\s+isTwitchOauthConfigured/);
    expect(src).toMatch(/export\s+function\s+getTwitchMissionTarget/);
  });
});

describe('[twitch-fase-b] route /connect', () => {
  const src = read(P.routeConnect);

  it('exige sesión Better Auth (401 sin login)', () => {
    expect(src).toMatch(/auth\.api\.getSession/);
    expect(src).toMatch(/unauthenticated|401/);
  });

  it('genera state 32-byte hex y cookie httpOnly + sameSite=lax', () => {
    expect(src).toMatch(/randomBytes\s*\(\s*32\s*\)/);
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/sameSite:\s*['"]lax['"]/);
  });

  it('redirige a id.twitch.tv/oauth2/authorize con response_type=code y scope canónico', () => {
    expect(src).toMatch(/id\.twitch\.tv\/oauth2\/authorize/);
    expect(src).toMatch(/response_type/);
    expect(src).toMatch(/TWITCH_OAUTH_SCOPES/);
  });

  it('fail-safe: 503 si Twitch OAuth no está configurado', () => {
    expect(src).toMatch(/isTwitchOauthConfigured/);
    expect(src).toMatch(/twitch_oauth_not_configured/);
    expect(src).toMatch(/503/);
  });
});

describe('[twitch-fase-b] route /callback', () => {
  const src = read(P.routeCallback);

  it('verifica state cookie contra querystring', () => {
    expect(src).toMatch(/sp_twitch_oauth_state/);
    expect(src).toMatch(/state_mismatch|savedState\s*!==\s*state/);
  });

  it('borra la state cookie tras usarla (single use)', () => {
    expect(src).toMatch(/\.delete\(['"]sp_twitch_oauth_state['"]\)/);
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

  it('NO guarda refresh_token (Fase B — política acordada)', () => {
    // Ninguna llamada a encrypt sobre refresh_token, ni asignación a
    // refreshTokenEncrypted, ni referencia a la columna en el upsert.
    expect(src).not.toMatch(/encrypt\s*\(\s*tokenData\.refresh_token/);
    expect(src).not.toMatch(/refreshTokenEncrypted\s*:/);
  });

  it('NO persiste la lista de canales seguidos del usuario', () => {
    // El callback no debe llamar a /helix/channels/followed — eso pasa
    // en la server action, en cada verificación.
    expect(src).not.toMatch(/channels\/followed/);
  });

  it('fetch usa Client-Id header como exige Helix', () => {
    // GET /helix/users requiere Bearer + Client-Id.
    expect(src).toMatch(/'Client-Id'\s*:\s*clientId/);
  });
});

describe('[twitch-fase-b] route /disconnect', () => {
  const src = read(P.routeDisconnect);

  it('requiere sesión y llama markAccountDisconnected con provider="twitch"', () => {
    expect(src).toMatch(/getSession/);
    expect(src).toMatch(/markAccountDisconnected\(session\.user\.id,\s*['"]twitch['"]\)/);
  });

  it('es POST, no GET (evita CSRF trivial)', () => {
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).not.toMatch(/export\s+async\s+function\s+GET/);
  });
});

describe('[twitch-fase-b] server action verifyTwitchMission', () => {
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

  it('exige provider="twitch" y verificationMode="twitch_follow_channel"', () => {
    expect(src).toMatch(/mission\.provider\s*!==\s*['"]twitch['"]/);
    expect(src).toMatch(/TWITCH_FOLLOW_CHANNEL_MODE/);
  });

  it('descifra el token y llama al endpoint oficial Helix con Client-Id', () => {
    expect(src).toMatch(/decrypt\s*\(\s*account\.accessTokenEncrypted\s*\)/);
    expect(src).toMatch(/api\.twitch\.tv\/helix\/channels\/followed/);
    expect(src).toMatch(/'Client-Id'\s*:\s*clientId/);
    expect(src).toMatch(/cache:\s*['"]no-store['"]/);
  });

  it('NO usa endpoints deprecated ni no oficiales (ej. `/users/follows`)', () => {
    // Old endpoint `/helix/users/follows` fue deprecado por Twitch (Aug 2023).
    expect(src).not.toMatch(/\/helix\/users\/follows/);
    // Ningún endpoint fuera de api.twitch.tv o id.twitch.tv.
    expect(src).not.toMatch(/decapi\.me/);
    expect(src).not.toMatch(/twitchtracker/);
  });

  it('registra intento en cada outcome canónico', () => {
    expect(src).toMatch(/recordAttempt\s*\(/);
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
    expect(src).not.toMatch(/console\.[a-z]+\s*\([^)]*client_secret/);
  });
});

describe('[twitch-fase-b] UI — TwitchMissionCard', () => {
  const src = read(P.ui);

  it('marca "use client"', () => {
    expect(src.trimStart()).toMatch(/^['"]use client['"]/);
  });

  it('CTA "Conectar Twitch" apunta a /api/auth/social/twitch/connect', () => {
    expect(src).toMatch(/\/api\/auth\/social\/twitch\/connect/);
    expect(src).toMatch(/Conectar Twitch/);
  });

  it('CTA "Reconectar Twitch" para estado token_expired', () => {
    expect(src).toMatch(/Reconectar Twitch/);
    expect(src).toMatch(/token_expired/);
  });

  it('CTA "Verificar misión" llama a verifyTwitchMission', () => {
    expect(src).toMatch(/verifyTwitchMission/);
    expect(src).toMatch(/Verificar misión/);
  });

  it('CTA "Abrir Twitch" solo si hay channelUrl', () => {
    expect(src).toMatch(/channelUrl \?/);
    expect(src).toMatch(/Abrir Twitch/);
  });

  it('nota de privacidad visible', () => {
    expect(src).toMatch(/No publicaremos nada en tu nombre/);
  });
});

describe('[twitch-fase-b] MissionsGrid wiring Twitch', () => {
  const src = read(P.grid);

  it('renderiza TwitchMissionCard cuando hay misión provider="twitch"', () => {
    expect(src).toMatch(/TwitchMissionCard/);
    expect(src).toMatch(/provider === ['"]twitch['"]/);
  });

  it('mantiene el bloque Discord', () => {
    expect(src).toMatch(/DiscordMissionCard/);
  });

  it('el placeholder YouTube sigue rendered', () => {
    expect(src).toMatch(/<YoutubeMissionsPlaceholder/);
  });
});

describe('[twitch-fase-b] Landing pasa twitch prop con guard 3-piezas', () => {
  const src = read(P.landing);

  it('llama getConnectedAccount con provider "twitch"', () => {
    expect(src).toMatch(/getConnectedAccount\(userId,\s*['"]twitch['"]\)/);
  });
  it('pasa twitch prop a <MissionsGrid />', () => {
    expect(src).toMatch(/<MissionsGrid[\s\S]*twitch=\{/);
  });
  it('guard incluye target + OAuth + cifrado (fail-safe)', () => {
    expect(src).toMatch(/getTwitchMissionTarget/);
    expect(src).toMatch(/isTwitchOauthConfigured/);
    expect(src).toMatch(/isTokenEncryptionConfigured/);
  });
});

describe('[twitch-fase-b] CSS scoped bajo .giveaway-platform', () => {
  const src = read(P.css);
  const layout = read(P.layout);

  it('todas las reglas scoped', () => {
    const rules = src.match(/^\.\S+/gm) ?? [];
    for (const rule of rules) {
      expect(rule).toMatch(/^\.giveaway-platform/);
    }
  });

  it('el layout importa el CSS Twitch', () => {
    expect(layout).toMatch(/platform-twitch-mission\.css/);
  });
});

describe('[twitch-fase-b] seed script con guard', () => {
  const src = read(P.seed);
  it('requiere CONFIRM_SEED_TWITCH_MISSION=I_ACCEPT_TWITCH_MISSION', () => {
    expect(src).toMatch(/CONFIRM_SEED_TWITCH_MISSION/);
    expect(src).toMatch(/I_ACCEPT_TWITCH_MISSION/);
  });
  it('provider="twitch", verificationMode=twitch_follow_channel', () => {
    expect(src).toMatch(/provider:\s*['"]twitch['"]/);
    expect(src).toMatch(/TWITCH_FOLLOW_CHANNEL_MODE/);
  });
  it('rewardCoins=100', () => {
    expect(src).toMatch(/REWARD_COINS\s*=\s*100/);
  });
});

describe('[twitch-fase-b] doc de setup existe y tiene secciones canónicas', () => {
  const src = read(P.doc);
  it.each([
    'Twitch Developer Console',
    'Redirect URL',
    'broadcaster.{0,3}id',
    'Fase B',
    'refresh',
  ])('menciona "%s"', (needle) => {
    expect(src).toMatch(new RegExp(needle, 'i'));
  });
});
