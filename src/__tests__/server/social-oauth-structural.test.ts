/**
 * Verificaciones estructurales del flujo OAuth de social linking.
 * No corren HTTP ni DB — leen el source y validan contratos clave.
 *
 * Patrón que ya usan `steam-openid.test.ts` y `giveaway-platform-v2-shell.test.ts`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[social-oauth] connect route', () => {
  const src = read('src/app/api/social/[provider]/connect/route.ts');

  it('requiere sesión antes de emitir state', () => {
    expect(src).toMatch(/auth\.api\.getSession/);
    expect(src).toMatch(/session\?\.user/);
  });
  it('valida provider unknown → 400', () => {
    expect(src).toMatch(/status:\s*400/);
    expect(src).toMatch(/provider_unknown/);
  });
  it('valida provider planned → 501', () => {
    expect(src).toMatch(/status:\s*501/);
    expect(src).toMatch(/provider_planned/);
  });
  it('valida provider not configured → 503', () => {
    expect(src).toMatch(/status:\s*503/);
    expect(src).toMatch(/provider_not_configured/);
  });
  it('genera state firmado + cookie httpOnly Path=/api/social', () => {
    expect(src).toMatch(/generateState/);
    expect(src).toMatch(/signState/);
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/path:\s*['"]\/api\/social['"]/);
    expect(src).toMatch(/sameSite:\s*['"]lax['"]/);
  });
  it('Google añade access_type=offline + prompt=consent', () => {
    expect(src).toMatch(/access_type[\s\S]{0,40}offline/);
    expect(src).toMatch(/prompt[\s\S]{0,40}consent/);
  });
});

describe('[social-oauth] callback route', () => {
  const src = read('src/app/api/social/[provider]/callback/route.ts');

  it('verifica state cookie contra state query', () => {
    expect(src).toMatch(/verifyState/);
    expect(src).toMatch(/payload\.state\s*!==\s*stateQuery/);
  });
  it('rechaza si falta code o error del provider', () => {
    expect(src).toMatch(/user_denied|providerError/);
    expect(src).toMatch(/no_code/);
  });
  it('llama exchangeCode → fetchProfile → upsertSocialAccount', () => {
    expect(src).toMatch(/exchangeCode\(/);
    expect(src).toMatch(/fetchProfile\(/);
    expect(src).toMatch(/upsertSocialAccount\(/);
  });
  it('mapea SocialAccountAlreadyLinkedError → already_linked', () => {
    expect(src).toMatch(/SocialAccountAlreadyLinkedError/);
    expect(src).toMatch(/already_linked/);
  });
  it('limpia state cookie al terminar', () => {
    expect(src).toMatch(/STATE_COOKIE_NAME[\s\S]{0,150}maxAge:\s*0/);
  });
});

describe('[social-oauth] disconnect server action', () => {
  const src = read('src/app/sorteos/plataforma/perfil/actions.ts');

  it('requiere sesión', () => {
    expect(src).toMatch(/auth\.api\.getSession/);
    expect(src).toMatch(/no_session/);
  });
  it('valida provider ∈ active whitelist', () => {
    expect(src).toMatch(/isActiveProvider/);
    expect(src).toMatch(/provider_unknown/);
  });
  it('deleteSocialAccount + revokeToken best-effort', () => {
    expect(src).toMatch(/deleteSocialAccount\(/);
    expect(src).toMatch(/revokeToken\(/);
  });
  it('revalida /sorteos/plataforma/perfil', () => {
    expect(src).toMatch(/revalidatePath\(['"]\/sorteos\/plataforma\/perfil['"]\)/);
  });
});

describe('[social-oauth] accounts data layer', () => {
  const src = read('src/lib/social/accounts.ts');

  it('cifra access_token con encryptToken antes de guardar', () => {
    expect(src).toMatch(/encryptToken\(token\.accessToken\)/);
  });
  it('ON CONFLICT (user_id, provider) DO UPDATE en upsert', () => {
    expect(src).toMatch(/onConflictDoUpdate/);
    expect(src).toMatch(/connectedSocialAccounts\.userId,\s*connectedSocialAccounts\.provider/);
  });
  it('captura UNIQUE(provider, provider_user_id) violation → SocialAccountAlreadyLinkedError', () => {
    expect(src).toMatch(/isUniqueViolation/);
    expect(src).toMatch(/SocialAccountAlreadyLinkedError/);
  });
  it('getConnectedAccountsSafe NUNCA devuelve tokens', () => {
    // Debe seleccionar solo campos seguros (id/provider/username/avatar/scopes/expiresAt/dates).
    // NO debe incluir accessTokenEnc ni refreshTokenEnc en el SELECT.
    expect(src).toMatch(/export async function getConnectedAccountsSafe/);
    const fnScope = /getConnectedAccountsSafe[\s\S]*?^}/m.exec(src)?.[0] ?? '';
    expect(fnScope).not.toMatch(/accessTokenEnc/);
    expect(fnScope).not.toMatch(/refreshTokenEnc/);
  });
});

describe('[social-oauth] no leak de tokens en UI/logs', () => {
  const files = [
    'src/features/giveaway-platform/components/SocialAccountCard.tsx',
    'src/app/sorteos/plataforma/perfil/page.tsx',
  ];
  for (const rel of files) {
    it(`${rel} no referencia accessTokenEnc/refreshTokenEnc`, () => {
      const src = read(rel);
      expect(src).not.toMatch(/accessTokenEnc/);
      expect(src).not.toMatch(/refreshTokenEnc/);
    });
  }

  it('ningún archivo de lib/social hace console.log con "token"', () => {
    const files = [
      'src/lib/social/crypto.ts',
      'src/lib/social/state.ts',
      'src/lib/social/oauth.ts',
      'src/lib/social/accounts.ts',
      'src/lib/social/providers.ts',
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(/console\.log[\s\S]{0,80}token/i);
      expect(src).not.toMatch(/console\.error[\s\S]{0,80}token/i);
    }
  });
});

describe('[social-oauth] env vars declaradas server-only', () => {
  const src = read('src/lib/env.ts');

  it('SOCIAL_TOKEN_ENCRYPTION_KEY vive en el bloque server', () => {
    expect(src).toMatch(/server:\s*\{[\s\S]*SOCIAL_TOKEN_ENCRYPTION_KEY[\s\S]*\},/);
  });
  it('DISCORD_CLIENT_SECRET vive en el bloque server', () => {
    expect(src).toMatch(/server:\s*\{[\s\S]*DISCORD_CLIENT_SECRET[\s\S]*\},/);
  });
  it('GOOGLE_CLIENT_SECRET vive en el bloque server', () => {
    expect(src).toMatch(/server:\s*\{[\s\S]*GOOGLE_CLIENT_SECRET[\s\S]*\},/);
  });
  it('ninguna client secret está en el bloque client', () => {
    const clientBlock = /client:\s*\{[\s\S]*?\},/.exec(src)?.[0] ?? '';
    expect(clientBlock).not.toMatch(/CLIENT_SECRET/);
    expect(clientBlock).not.toMatch(/SOCIAL_TOKEN_ENCRYPTION_KEY/);
  });
});
