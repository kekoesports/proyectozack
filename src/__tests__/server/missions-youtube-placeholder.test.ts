/**
 * Contratos del placeholder "Misiones YouTube · Próximamente".
 *
 * Regla dura: es un componente meramente visual. NO tiene botón de
 * reclamar, verificar ni conectar. NO ejecuta lógica ni fetch. NO
 * concede puntos ni simula verificación.
 *
 * Cuando arranque la fase 2 (OAuth Google + YouTube Data API v3) se
 * sustituye por la card real. Este placeholder existe solo para
 * comunicar la ausencia intencional.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const COMPONENT = 'src/features/giveaway-platform/components/MissionsGrid.tsx';
const CSS = 'src/app/sorteos/plataforma/platform-missions-yt-placeholder.css';
const LAYOUT = 'src/app/sorteos/layout.tsx';

describe('[missions-yt-placeholder] wiring básico', () => {
  it('MissionsGrid.tsx renderiza <YoutubeMissionsPlaceholder />', () => {
    const src = read(COMPONENT);
    expect(src).toMatch(/function YoutubeMissionsPlaceholder/);
    expect(src).toMatch(/<YoutubeMissionsPlaceholder\s*\/>/);
  });

  it('el placeholder se monta dentro del grid de misiones de redes (junto a Discord/Twitch), no después del botón "Ver más"', () => {
    // Decisión de producto (2026-07-09): unificar las 3 misiones de redes
    // como cards del mismo tamaño en un grid común arriba. Antes YouTube
    // vivía al final como banner full-width. Ver commit.
    const src = read(COMPONENT);
    const idxMore = src.indexOf('gp-missions-more');
    const idxPlaceholder = src.indexOf('<YoutubeMissionsPlaceholder');
    expect(idxMore).toBeGreaterThan(-1);
    expect(idxPlaceholder).toBeGreaterThan(-1);
    // Debe aparecer ANTES del botón "Ver más" (en el grid de placeholders sociales).
    expect(idxPlaceholder).toBeLessThan(idxMore);
  });

  it('CSS existe y lo importa el layout raíz', () => {
    expect(fs.existsSync(path.join(ROOT, CSS))).toBe(true);
    const src = read(LAYOUT);
    expect(src).toMatch(/import\s+['"]\.\/plataforma\/platform-missions-yt-placeholder\.css['"]/);
  });
});

describe('[missions-yt-placeholder] copy visible correcto', () => {
  const src = read(COMPONENT);
  const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';

  it('title contiene "Misiones de YouTube" + "Próximamente"', () => {
    // Copy actualizado 2026-07-10 (Fase 1 PR6 del audit): tono
    // informativo, sin lenguaje de acción ni promesa de puntos.
    expect(src).toMatch(/Misiones de YouTube/);
    expect(src).toMatch(/Próximamente/);
  });

  it('descripción menciona suscripción y comentarios en tono informativo', () => {
    expect(fnBody).toMatch(/verificaciones de suscripción y comentarios/i);
  });

  it('deja claro que la integración está en preparación', () => {
    expect(fnBody).toMatch(/Estamos preparando|preparando la integración|en preparación/i);
  });

  it('NO usa lenguaje de acción del usuario ("Conecta tu cuenta", "completa acciones")', () => {
    // El placeholder no debe hacer parecer que hay algo que el usuario
    // pueda hacer ahora. Copy anterior generaba expectativa falsa.
    expect(fnBody).not.toMatch(/Conecta tu cuenta/i);
    expect(fnBody).not.toMatch(/completa acciones verificables/i);
  });
});

describe('[missions-yt-placeholder] NO tiene botón de reclamar ni verificar', () => {
  it('NO hay <button> dentro de YoutubeMissionsPlaceholder', () => {
    const src = read(COMPONENT);
    const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';
    expect(fnBody.length).toBeGreaterThan(80);
    expect(fnBody).not.toMatch(/<button[\s>]/);
  });

  it('NO hay <a href> (nada clickable dentro del componente)', () => {
    const src = read(COMPONENT);
    const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';
    expect(fnBody).not.toMatch(/<a\s+href=/);
    // Tampoco un onClick handler nativo.
    expect(fnBody).not.toMatch(/onClick/);
  });

  it('el copy NO contiene labels de acción como "Conectar YouTube", "Verificar misión", "Reclamar"', () => {
    const src = read(COMPONENT);
    const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';
    // Estos labels solo deben aparecer cuando exista la card real.
    expect(fnBody).not.toMatch(/Conectar YouTube/);
    expect(fnBody).not.toMatch(/Verificar misión/);
    expect(fnBody).not.toMatch(/\bReclamar\b/);
  });
});

describe('[missions-yt-placeholder] NO ejecuta lógica ni fetch', () => {
  const src = read(COMPONENT);

  it('el componente no hace fetch, no importa server actions ni next/router', () => {
    const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';
    expect(fnBody).not.toMatch(/fetch\s*\(/);
    expect(fnBody).not.toMatch(/useTransition|useRouter/);
    expect(fnBody).not.toMatch(/redeemShopItem|verifyYoutubeMission|claimDailyReward/);
  });

  it('el componente no usa useEffect / useState internos (es estático)', () => {
    const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';
    expect(fnBody).not.toMatch(/useState|useEffect|useMemo|useCallback/);
  });
});

describe('[missions-yt-placeholder] NO simula verificación ni promete puntos concretos', () => {
  const src = read(COMPONENT);
  const fnBody = src.match(/function YoutubeMissionsPlaceholder[\s\S]*?^}$/m)?.[0] ?? '';

  it('NO incluye número concreto de puntos en el copy del placeholder', () => {
    // Un texto como "gana 100 puntos" sería confuso porque el sistema
    // todavía no verifica ni concede nada. El copy habla en genérico.
    expect(fnBody).not.toMatch(/\b\d+\s*puntos/);
  });

  it('NO renderiza el badge "+N ⭐" de recompensa (Fase 1 PR6 del audit)', () => {
    // Regresión anti-badge: antes del PR6 el placeholder promocionaba
    // "+100 ⭐" como si fuera una card real con recompensa concreta.
    // Ahora no hay ninguna cifra de puntos en el JSX del placeholder.
    expect(fnBody).not.toMatch(/gp-mission-reward/);
    expect(fnBody).not.toMatch(/\+\s*\d+\s*⭐/);
  });

  it('aplica clase "is-soft" para tono discreto', () => {
    // Regresión: si alguien quita el is-soft, el placeholder recupera el
    // estilo "destacado" (radial gradient, borde saturado) que hacía
    // parecer que "no funcionaba".
    expect(fnBody).toMatch(/is-soft/);
  });

  it('NO usa palabras que sugieran acción "completed", "ganaste", "verificado"', () => {
    expect(fnBody).not.toMatch(/completed|verificado|ganaste|has ganado/i);
  });
});

describe('[missions-yt-placeholder] CSS scoped y sin efectos globales', () => {
  const css = read(CSS);

  it('todas las reglas están scoped bajo .giveaway-platform', () => {
    // Capturamos el selector completo hasta el primer espacio o `{`.
    const rules = css.match(/^\.\S+/gm) ?? [];
    for (const rule of rules) {
      expect(rule).toMatch(/^\.giveaway-platform/);
    }
  });

  it('define título, icon, body y badge Próximamente', () => {
    expect(css).toMatch(/\.gp-missions-yt-placeholder\s*\{/);
    expect(css).toMatch(/\.gp-missions-yt-icon\s*\{/);
    expect(css).toMatch(/\.gp-missions-yt-body\s*\{/);
    expect(css).toMatch(/\.gp-missions-yt-soon\s*\{/);
  });

  it('incluye ajuste responsive en 480px', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
  });

  it('no filtra secretos ni URLs de OAuth Google (no aplica aún)', () => {
    expect(css).not.toMatch(/GOOGLE_CLIENT_ID|GOCSPX-|accounts\.google\.com\/o\/oauth2/);
  });
});

describe('[missions-yt-placeholder] no toca lógica ni schema de misiones', () => {
  it('platform_missions schema no cambia', () => {
    const schema = read('src/db/schema/platformMissions.ts');
    // Se conservan los tipos base — no se meten aquí los youtube_* prematuros.
    expect(schema).not.toMatch(/youtube_subscribe|youtube_comment/);
  });

  it('MissionConditionType type no ha añadido tipos youtube', () => {
    const types = read('src/types/giveawayPlatform.ts');
    expect(types).not.toMatch(/youtube_subscribe|youtube_comment/);
  });

  it('src/lib/env.ts no añade GOOGLE_CLIENT_ID/SECRET ni redirect', () => {
    const env = read('src/lib/env.ts');
    expect(env).not.toContain('GOOGLE_CLIENT_ID');
    expect(env).not.toContain('GOOGLE_CLIENT_SECRET');
    expect(env).not.toContain('GOOGLE_OAUTH_REDIRECT_URL');
    // TOKEN_ENCRYPTION_KEY sí se añade — pero por Discord Fase A, no por YouTube.
  });
});
