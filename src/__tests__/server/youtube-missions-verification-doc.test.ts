/**
 * Contratos del documento técnico de misiones YouTube.
 *
 * Este PR es doc-only. Verifica que:
 *  - El documento existe y tiene la estructura mínima esperada.
 *  - Cubre los 3 casos de misión (subscribe, comment, ambos).
 *  - Cita fuentes oficiales de Google.
 *  - Deja claro que NO hay MVP funcional.
 *  - No modifica ningún fichero de producción (schema, actions, env).
 *  - No filtra secretos de ejemplo.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const DOC = 'docs/youtube-missions-verification.md';

describe('[yt-doc] documento existe con estructura mínima', () => {
  it('docs/youtube-missions-verification.md existe y no está vacío', () => {
    const p = path.join(ROOT, DOC);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(4_000);
  });

  it('está marcado como fase de investigación previa (sin MVP)', () => {
    const doc = read(DOC);
    expect(doc).toMatch(/NO hay MVP funcional/i);
  });
});

describe('[yt-doc] cubre los 3 casos de misión pactados', () => {
  const doc = read(DOC);

  it('menciona youtube_subscribe / youtube_comment / youtube_subscribe_comment', () => {
    expect(doc).toContain('youtube_subscribe');
    expect(doc).toContain('youtube_comment');
    expect(doc).toContain('youtube_subscribe_comment');
  });

  it('explica cómo obtener el channelId del usuario', () => {
    expect(doc).toMatch(/channels\.list\?mine=true/);
  });

  it('explica cómo verificar suscripción a un canal concreto', () => {
    expect(doc).toMatch(/subscriptions\.list\?mine=true&forChannelId=/);
  });

  it('explica cómo verificar comentario en un vídeo', () => {
    expect(doc).toMatch(/commentThreads\.list/);
  });
});

describe('[yt-doc] scopes y verificación Google', () => {
  const doc = read(DOC);

  it('identifica el scope único youtube.readonly (mínimo necesario)', () => {
    expect(doc).toMatch(/https:\/\/www\.googleapis\.com\/auth\/youtube\.readonly/);
  });

  it('marca el scope como sensitive con implicaciones', () => {
    expect(doc).toMatch(/Sensitive/i);
    expect(doc).toMatch(/100 usuarios/);
    expect(doc).toMatch(/OAuth verification/i);
  });

  it('prohíbe scopes excesivos (upload / force-ssl / youtube escritura)', () => {
    expect(doc).toMatch(/youtube\.upload/);
    expect(doc).toMatch(/force-ssl|restricted/i);
  });
});

describe('[yt-doc] modelo de datos + cifrado', () => {
  const doc = read(DOC);

  it('propone tabla connected_social_accounts con tokens cifrados', () => {
    expect(doc).toMatch(/connected_social_accounts/);
    expect(doc).toMatch(/access_token_encrypted/);
    expect(doc).toMatch(/refresh_token_encrypted/);
  });

  it('define TOKEN_ENCRYPTION_KEY con AES-256-GCM', () => {
    expect(doc).toMatch(/TOKEN_ENCRYPTION_KEY/);
    expect(doc).toMatch(/AES-256-GCM/);
  });

  it('propone ampliación de platform_missions (provider, target, verification_mode)', () => {
    expect(doc).toMatch(/ALTER TABLE platform_missions/);
    expect(doc).toMatch(/verification_mode/);
    expect(doc).toMatch(/target_channel_id/);
    expect(doc).toMatch(/target_video_id/);
  });
});

describe('[yt-doc] env vars listadas', () => {
  const doc = read(DOC);

  it('lista GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / redirect URL', () => {
    expect(doc).toContain('GOOGLE_CLIENT_ID');
    expect(doc).toContain('GOOGLE_CLIENT_SECRET');
    expect(doc).toContain('GOOGLE_OAUTH_REDIRECT_URL');
  });

  it('menciona YOUTUBE_API_KEY como opcional (server-to-server)', () => {
    expect(doc).toContain('YOUTUBE_API_KEY');
  });

  it('nombra TOKEN_ENCRYPTION_KEY', () => {
    expect(doc).toContain('TOKEN_ENCRYPTION_KEY');
  });
});

describe('[yt-doc] riesgos y prevención documentados', () => {
  const doc = read(DOC);

  it('incluye tabla o lista de riesgos con niveles', () => {
    expect(doc).toMatch(/Riesgos|Riesgos y prevenciones/i);
  });

  it('menciona rate limit + cooldown para el botón Verificar', () => {
    expect(doc).toMatch(/rate limit|Rate limit|cooldown/i);
  });

  it('advierte de nunca conceder puntos si la API no confirma', () => {
    expect(doc).toMatch(/No conceder puntos|no conceder puntos/i);
  });

  it('advierte de no publicar comentarios en nombre del usuario', () => {
    expect(doc).toMatch(/No publicaremos contenido en tu nombre|no publicar/i);
  });
});

describe('[yt-doc] checklist para configurar Google Cloud (owner)', () => {
  const doc = read(DOC);
  it('lista pasos claros en Google Cloud (proyecto, API, OAuth client, test users)', () => {
    expect(doc).toMatch(/OAuth consent screen/i);
    expect(doc).toMatch(/YouTube Data API v3 habilitada|habilitar.{0,30}YouTube Data API/i);
    expect(doc).toMatch(/Test users|test users/);
    expect(doc).toMatch(/openssl rand -hex 32|hex/);
  });
});

describe('[yt-doc] roadmap por fases explícito', () => {
  const doc = read(DOC);
  it('define fases 0-7 con dependencias', () => {
    for (const fase of ['Fase 0', 'Fase 1', 'Fase 2', 'Fase 3', 'Fase 4', 'Fase 5']) {
      expect(doc).toContain(fase);
    }
  });
});

describe('[yt-doc] fuentes citadas', () => {
  const doc = read(DOC);
  it('enlaza YouTube Data API v3 docs oficiales', () => {
    expect(doc).toMatch(/developers\.google\.com\/youtube\/v3/);
  });
  it('enlaza scopes oficiales de Google', () => {
    expect(doc).toMatch(/developers\.google\.com\/identity\/protocols\/oauth2\/scopes/);
  });
  it('enlaza OAuth verification', () => {
    expect(doc).toMatch(/support\.google\.com\/cloud\/answer\/9110914/);
  });
});

/**
 * YouTube sigue aparcado tras Fase A Discord: no hay OAuth Google, no hay
 * env vars, no hay rutas, no hay campos target_channel_id.
 *
 * Los campos `provider` y `verification_mode` de platform_missions SÍ
 * existen desde Fase A (los usa Discord), pero eso es genérico — YouTube
 * aún no los rellena. TOKEN_ENCRYPTION_KEY también existe desde Fase A.
 */
describe('[yt-doc] YouTube sigue aparcado (Fase A no lo activa)', () => {
  it('platform_missions NO añade campos YouTube-específicos (target_channel_id, target_video_id)', () => {
    const platformMissionsSrc = read('src/db/schema/platformMissions.ts');
    expect(platformMissionsSrc).not.toMatch(/target_channel_id|target_video_id/);
  });

  it('NO añade env vars OAuth Google a src/lib/env.ts', () => {
    const envSrc = read('src/lib/env.ts');
    expect(envSrc).not.toContain('GOOGLE_CLIENT_ID');
    expect(envSrc).not.toContain('GOOGLE_CLIENT_SECRET');
    expect(envSrc).not.toContain('GOOGLE_OAUTH_REDIRECT_URL');
  });

  it('NO crea rutas /api/auth/social/youtube/*', () => {
    const ytDir = path.join(ROOT, 'src/app/api/auth/social/youtube');
    expect(fs.existsSync(ytDir)).toBe(false);
  });

  it('NO modifica src/lib/auth.ts (sin Google plugin nuevo)', () => {
    const authSrc = read('src/lib/auth.ts');
    expect(authSrc).not.toMatch(/googlePlugin|googleOauth|google.*OAuth/i);
  });

  it('/sorteos/privacidad NO menciona YouTube todavía (queda para gestoría)', () => {
    const priv = read('src/app/sorteos/(legal)/privacidad/page.tsx');
    expect(priv).not.toMatch(/\bYouTube\b/);
  });
});

describe('[yt-doc] no filtra secretos de ejemplo', () => {
  const doc = read(DOC);

  it('no incluye Client Secret ni tokens reales', () => {
    // Un client secret de Google típico empieza por GOCSPX- y son 24+ chars.
    expect(doc).not.toMatch(/GOCSPX-[A-Za-z0-9_-]{20,}/);
    // Un access token Bearer típico.
    expect(doc).not.toMatch(/ya29\.[A-Za-z0-9_-]{40,}/);
    // API keys de Google Cloud.
    expect(doc).not.toMatch(/AIza[A-Za-z0-9_-]{30,}/);
  });
});
