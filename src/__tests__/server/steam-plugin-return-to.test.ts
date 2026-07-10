/**
 * Verifica estructuralmente que el plugin Steam OpenID persiste y aplica
 * el `returnTo` correctamente. No podemos simular el flow completo contra
 * Steam sin credenciales reales; sí podemos garantizar por grep del
 * fuente que las piezas críticas están en el orden esperado:
 *
 *   /steam/login:
 *     - lee ctx.query['returnTo']
 *     - sanitiza con sanitizeReturnTo
 *     - persiste en cookie firmada `steam_return_to`
 *
 *   /steam/callback:
 *     - lee cookie `steam_return_to`
 *     - re-sanitiza (defense-in-depth)
 *     - en cada rama de error redirige preservando returnTo
 *     - en éxito redirige al returnTo (o al successUrl si el helper
 *       degradó al fallback — comportamiento previo intacto).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/lib/steam/plugin.ts'),
  'utf8',
);

function sliceBetween(needleStart: string, needleEnd: string): string {
  const a = SOURCE.indexOf(needleStart);
  const b = SOURCE.indexOf(needleEnd, a + 1);
  if (a < 0 || b < 0) return '';
  return SOURCE.slice(a, b);
}

/** Extrae desde `needleStart` hasta el final del fichero. */
function sliceFrom(needleStart: string): string {
  const a = SOURCE.indexOf(needleStart);
  return a < 0 ? '' : SOURCE.slice(a);
}

describe('steam plugin — /steam/login persiste returnTo', () => {
  const loginBody = sliceBetween('steamLogin: createAuthEndpoint', 'steamCallback:');

  it('lee ctx.query[\'returnTo\']', () => {
    expect(loginBody).toMatch(/ctx\.query\[\s*['"]returnTo['"]\s*\]/);
  });

  it('sanitiza el valor recibido con sanitizeReturnTo', () => {
    // Debe llamarse a sanitizeReturnTo con el valor crudo antes de guardar.
    expect(loginBody).toMatch(/sanitizeReturnTo\(/);
  });

  it('persiste el valor sanitizado en la cookie firmada steam_return_to', () => {
    expect(loginBody).toMatch(/setSignedCookie\(\s*RETURN_TO_COOKIE/);
  });

  it('la cookie steam_return_to usa httpOnly, sameSite lax y path root', () => {
    // Compartimos cookieOpts entre state + return-to. Las opciones deben
    // estar declaradas al menos una vez con los valores de seguridad.
    expect(loginBody).toMatch(/httpOnly:\s*true/);
    expect(loginBody).toMatch(/sameSite:\s*['"]lax['"]/);
    expect(loginBody).toMatch(/path:\s*['"]\/['"]/);
  });

  it('la constante RETURN_TO_COOKIE está definida arriba del plugin', () => {
    expect(SOURCE).toMatch(/RETURN_TO_COOKIE\s*=\s*['"]steam_return_to['"]/);
  });

  it('el maxAge de la cookie iguala el TTL del state OpenID', () => {
    // Reutilizamos STATE_TTL_SEC. Si divergen, riesgo de estados
    // inconsistentes (state expirado con returnTo vivo o al revés).
    expect(loginBody).toMatch(/maxAge:\s*STATE_TTL_SEC/);
  });
});

describe('steam plugin — /steam/callback consume returnTo', () => {
  // El callback va desde su declaración hasta el final del fichero (no hay
  // otro endpoint después). `sliceBetween(..., '};')` fallaba porque el
  // `};` primer match era el del `interface SteamSession`.
  const callbackBody = sliceFrom('steamCallback: createAuthEndpoint');

  it('lee la cookie steam_return_to del ctx firmado', () => {
    expect(callbackBody).toMatch(/getSignedCookie\(\s*RETURN_TO_COOKIE/);
  });

  it('re-sanitiza el valor de cookie (defense-in-depth)', () => {
    expect(callbackBody).toMatch(/sanitizeReturnTo\(/);
  });

  it('las 4 ramas de error redirigen a buildErrorRedirect (no al errorUrl legacy)', () => {
    // Antes: `${errorUrl}?steam_error=state`. Ahora: buildErrorRedirect('state').
    for (const kind of ['state', 'params', 'verify', 'steamid']) {
      const re = new RegExp(`buildErrorRedirect\\(\\s*['"]${kind}['"]\\s*\\)`);
      expect(callbackBody).toMatch(re);
    }
    // Y ningún redirect de error usa ya el patrón antiguo `${errorUrl}?steam_error=`
    expect(callbackBody).not.toMatch(/errorUrl\}\?steam_error=/);
  });

  it('buildErrorRedirect concatena con `&` si el returnTo ya tiene query, `?` si no', () => {
    // Nos importa la robustez de la construcción para casos como
    // `/sorteos/zacketizor?tab=misiones` que ya trae `?`.
    expect(callbackBody).toMatch(/includes\(\s*['"]\?['"]\s*\)\s*\?\s*['"]&['"]\s*:\s*['"]\?['"]/);
  });

  it('el redirect de éxito usa safeReturnTo cuando NO cayó al fallback, y successUrl cuando sí', () => {
    // Preserva comportamiento previo si no hay cookie: successUrl legacy
    // (`/sorteos/plataforma` → redirect a `/sorteos`). Con cookie válida:
    // safeReturnTo.
    expect(callbackBody).toMatch(/safeReturnTo\s*===\s*SAFE_RETURN_FALLBACK/);
    expect(callbackBody).toMatch(/\?\s*successUrl\s*:\s*safeReturnTo/);
  });

  it('el returnTo se lee ANTES que la validación del state', () => {
    // Regla: los errores tienen que poder redirigir al sitio de origen.
    // Si leemos returnTo después del state check no podemos preservar la
    // vuelta cuando el state falla.
    const returnIdx = callbackBody.search(/getSignedCookie\(\s*RETURN_TO_COOKIE/);
    const stateIdx = callbackBody.search(/getSignedCookie\(\s*STATE_COOKIE/);
    expect(returnIdx).toBeGreaterThan(0);
    expect(stateIdx).toBeGreaterThan(0);
    expect(returnIdx).toBeLessThan(stateIdx);
  });
});
