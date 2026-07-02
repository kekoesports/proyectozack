/**
 * Test estático del plugin Steam OpenID.
 *
 * NO ejecutamos el endpoint contra un servidor mock — eso requeriría montar
 * el runtime completo de Better Auth. Verificamos:
 *   1. El plugin está registrado en src/lib/auth.ts.
 *   2. Los endpoints /steam/login y /steam/callback existen.
 *   3. El UserPill apunta a la URL correcta.
 *   4. La server action de logout llama a auth.api.signOut.
 *   5. env.ts declara STEAM_API_KEY como opcional.
 *   6. La API key no se loguea desde profile.ts.
 */

import * as fs from 'fs';
import * as path from 'path';

// NOTA: no importamos `steamOpenId` directamente porque @better-auth/core es
// ESM-only y Jest (CJS) no lo transforma. Validamos vía static analysis del
// source, que es suficiente para PR1 (los tests dinámicos del flow completo
// vivirían en tests e2e, no unit).

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[steam-plugin] registro y endpoints', () => {
  it('src/lib/auth.ts registra el plugin steamOpenId', () => {
    const src = read('src/lib/auth.ts');
    expect(src).toMatch(/import\s+\{\s*steamOpenId\s*\}\s+from\s+['"]\.\/steam\/plugin['"]/);
    expect(src).toMatch(/plugins:\s*\[[^\]]*steamOpenId\(\)/);
  });

  it('plugin.ts declara los dos endpoints requeridos con method GET', () => {
    const src = read('src/lib/steam/plugin.ts');
    expect(src).toMatch(/id:\s*'steam-openid'/);
    expect(src).toMatch(/createAuthEndpoint\(\s*'\/steam\/login'\s*,\s*\{\s*method:\s*'GET'/);
    expect(src).toMatch(/createAuthEndpoint\(\s*'\/steam\/callback'\s*,\s*\{\s*method:\s*'GET'/);
  });

  it('login endpoint firma cookie de state httpOnly con maxAge <= 10 min', () => {
    const src = read('src/lib/steam/plugin.ts');
    expect(src).toMatch(/STATE_COOKIE\s*=\s*'steam_openid_state'/);
    expect(src).toMatch(/STATE_TTL_SEC\s*=\s*600/);
    expect(src).toMatch(/setSignedCookie\([\s\S]*httpOnly:\s*true/);
    expect(src).toMatch(/sameSite:\s*'lax'/);
  });

  it('callback valida state antes de cualquier operación', () => {
    const src = read('src/lib/steam/plugin.ts');
    // Localizamos el bloque del steamCallback y verificamos que la validación
    // de state ocurre antes de la llamada a verifyOpenIdResponse dentro DEL
    // BLOQUE (no del archivo, donde el import de verifyOpenIdResponse aparece
    // primero).
    const callbackStart = src.indexOf("'/steam/callback'");
    expect(callbackStart).toBeGreaterThan(0);
    const stateIdx = src.indexOf('stateCookie !== stateQuery', callbackStart);
    const verifyIdx = src.indexOf('verifyOpenIdResponse(', callbackStart);
    expect(stateIdx).toBeGreaterThan(0);
    expect(verifyIdx).toBeGreaterThan(stateIdx);
  });

  it('callback verifica OpenID contra Steam antes de upsert', () => {
    const src = read('src/lib/steam/plugin.ts');
    const callbackStart = src.indexOf("'/steam/callback'");
    const verifyIdx = src.indexOf('verifyOpenIdResponse(', callbackStart);
    const upsertIdx = src.indexOf('createOAuthUser(', callbackStart);
    expect(verifyIdx).toBeGreaterThan(0);
    expect(upsertIdx).toBeGreaterThan(verifyIdx);
  });

  it('callback usa onConflictDoNothing para player_profiles (preserva historial)', () => {
    const src = read('src/lib/steam/plugin.ts');
    expect(src).toMatch(/insert\(playerProfiles\)[\s\S]*onConflictDoNothing\(\)/);
  });

  it('callback usa setSessionCookie de Better Auth', () => {
    const src = read('src/lib/steam/plugin.ts');
    expect(src).toMatch(/import\s+\{\s*setSessionCookie\s*\}\s+from\s+['"]better-auth\/cookies['"]/);
    expect(src).toMatch(/setSessionCookie\(/);
  });
});

describe('[steam-plugin] env + placeholders', () => {
  it('src/lib/env.ts declara STEAM_API_KEY como opcional', () => {
    const src = read('src/lib/env.ts');
    expect(src).toMatch(/STEAM_API_KEY:\s*z\.string\(\)\.min\(1\)\.optional\(\)/);
    expect(src).toMatch(/STEAM_API_KEY:\s*process\.env\.STEAM_API_KEY/);
  });

  it('plugin no loguea STEAM_API_KEY', () => {
    const src = read('src/lib/steam/plugin.ts');
    // Cualquier console.* o logger.* que reciba STEAM_API_KEY sería un fallo.
    expect(src).not.toMatch(/console\.[a-z]+\(.*STEAM_API_KEY/);
    expect(src).not.toMatch(/logger\.[a-z]+\(.*STEAM_API_KEY/);
  });

  it('profile.ts no loguea la API key', () => {
    const src = read('src/lib/steam/profile.ts');
    expect(src).not.toMatch(/console\.[a-z]+\(.*apiKey/);
    expect(src).not.toMatch(/logger\.[a-z]+\(.*apiKey/);
  });
});

describe('[steam-plugin] UI + logout', () => {
  it('UserPill.tsx apunta a /api/auth/steam/login como botón de login', () => {
    const src = read('src/features/giveaway-platform/components/UserPill.tsx');
    expect(src).toMatch(/href=["']\/api\/auth\/steam\/login["']/);
    expect(src).toMatch(/Iniciar sesión con Steam/);
  });

  it('steamLogout llama a auth.api.signOut', () => {
    const src = read('src/features/giveaway-platform/actions/steamLogout.ts');
    expect(src).toMatch(/'use server'/);
    expect(src).toMatch(/auth\.api\.signOut/);
    expect(src).toMatch(/redirect\(['"]\/sorteos\/plataforma['"]\)/);
  });

  it('UserPill llama a steamLogout desde el item "Cerrar sesión"', () => {
    const src = read('src/features/giveaway-platform/components/UserPill.tsx');
    expect(src).toMatch(/import\s+\{\s*steamLogout\s*\}\s+from\s+['"]@\/features\/giveaway-platform\/actions\/steamLogout['"]/);
    expect(src).toMatch(/onClick=\{handleLogout\}/);
  });
});

describe('[steam-plugin] role safety', () => {
  it('el plugin fuerza role: null al crear user Steam', () => {
    const src = read('src/lib/steam/plugin.ts');
    expect(src).toMatch(/role:\s*null/);
  });

  it('no actualiza role en updateUser (solo name/image)', () => {
    const src = read('src/lib/steam/plugin.ts');
    // updateUser debe pasar solo name/image, nunca role
    const updateBlock = src.match(/updateUser\([^)]+,\s*\{[^}]+\}/g);
    expect(updateBlock).not.toBeNull();
    for (const b of updateBlock ?? []) {
      expect(b).not.toMatch(/role/);
    }
  });
});
