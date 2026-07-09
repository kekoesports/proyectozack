/**
 * Social missions "Próximamente" — tests estáticos.
 *
 * Cambios cubiertos:
 *   - Flags isDiscordComingSoon / isTwitchComingSoon (solo 'zacketizor').
 *   - Placeholders Discord + Twitch en MissionsGrid renderizados con
 *     copy exacto del brief.
 *   - Discord placeholder SIN ningún enlace ni botón OAuth.
 *   - Twitch placeholder incluye enlace público (twitch.tv/zacketizor)
 *     con target="_blank" y rel="noopener noreferrer".
 *   - Card real sigue teniendo prioridad cuando target y OAuth existen.
 *   - Sin migración, sin server actions nuevas.
 */

// Mock de env para poder importar los constants sin cargar Better Auth.
jest.mock('@/lib/env', () => ({
  env: new Proxy({}, { get: (_t, key: string) => process.env[key] }),
}));

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

import { isDiscordComingSoon } from '@/features/giveaway-platform/constants/discord-missions';
import { isTwitchComingSoon, getTwitchPublicChannelUrl } from '@/features/giveaway-platform/constants/twitch-missions';

describe('isDiscordComingSoon', () => {
  it('devuelve true para zacketizor', () => {
    expect(isDiscordComingSoon('zacketizor')).toBe(true);
  });

  it('devuelve false para cualquier otro slug', () => {
    expect(isDiscordComingSoon('imantado')).toBe(false);
    expect(isDiscordComingSoon('naow')).toBe(false);
    expect(isDiscordComingSoon('random-creator')).toBe(false);
    expect(isDiscordComingSoon('')).toBe(false);
  });
});

describe('isTwitchComingSoon', () => {
  it('devuelve true para zacketizor', () => {
    expect(isTwitchComingSoon('zacketizor')).toBe(true);
  });

  it('devuelve false para cualquier otro slug', () => {
    expect(isTwitchComingSoon('imantado')).toBe(false);
    expect(isTwitchComingSoon('naow')).toBe(false);
    expect(isTwitchComingSoon('random-creator')).toBe(false);
    expect(isTwitchComingSoon('')).toBe(false);
  });
});

describe('getTwitchPublicChannelUrl', () => {
  it('devuelve https://www.twitch.tv/zacketizor para zacketizor', () => {
    expect(getTwitchPublicChannelUrl('zacketizor')).toBe('https://www.twitch.tv/zacketizor');
  });

  it('devuelve null para slug desconocido', () => {
    expect(getTwitchPublicChannelUrl('imantado')).toBeNull();
    expect(getTwitchPublicChannelUrl('random')).toBeNull();
  });

  it('la URL es HTTPS y no contiene credenciales', () => {
    const url = getTwitchPublicChannelUrl('zacketizor');
    expect(url).toMatch(/^https:\/\/www\.twitch\.tv\//);
    expect(url).not.toMatch(/@/); // sin user:pass@host
    expect(url).not.toMatch(/[?&]token=|[?&]auth=/i);
  });
});

describe('MissionsGrid — placeholders sociales sin OAuth', () => {
  const source = read('src/features/giveaway-platform/components/MissionsGrid.tsx');

  it('DiscordMissionsPlaceholder tiene role="note"', () => {
    expect(source).toMatch(/function DiscordMissionsPlaceholder\(\)[\s\S]*?role="note"/);
  });

  it('DiscordMissionsPlaceholder NO contiene "Conectar Discord"', () => {
    const discordFn = source.split('function DiscordMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(discordFn).not.toMatch(/Conectar Discord/);
  });

  it('DiscordMissionsPlaceholder NO enlaza a /api/auth/social/discord/connect', () => {
    const discordFn = source.split('function DiscordMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(discordFn).not.toMatch(/\/api\/auth\/social\/discord\//);
  });

  it('DiscordMissionsPlaceholder NO tiene ningún <a> ni <Link> (cero salida)', () => {
    const discordFn = source.split('function DiscordMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(discordFn).not.toMatch(/<a\s/i);
    expect(discordFn).not.toMatch(/<Link\s/i);
  });

  it('DiscordMissionsPlaceholder NO tiene ningún <button>', () => {
    const discordFn = source.split('function DiscordMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(discordFn).not.toMatch(/<button/i);
  });

  it('DiscordMissionsPlaceholder incluye copy exacto del brief', () => {
    expect(source).toContain('Únete al Discord de ZACKETIZOR y consigue puntos cuando activemos esta misión');
  });

  it('DiscordMissionsPlaceholder marca "Próximamente"', () => {
    const discordFn = source.split('function DiscordMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(discordFn).toMatch(/Próximamente/);
  });

  it('TwitchMissionsPlaceholder tiene role="note"', () => {
    expect(source).toMatch(/function TwitchMissionsPlaceholder\([\s\S]*?role="note"/);
  });

  it('TwitchMissionsPlaceholder NO contiene "Conectar Twitch"', () => {
    const twitchFn = source.split('function TwitchMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(twitchFn).not.toMatch(/Conectar Twitch/);
  });

  it('TwitchMissionsPlaceholder NO enlaza a /api/auth/social/twitch/connect', () => {
    const twitchFn = source.split('function TwitchMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(twitchFn).not.toMatch(/\/api\/auth\/social\/twitch\//);
  });

  it('TwitchMissionsPlaceholder NO contiene "Verificar misión"', () => {
    const twitchFn = source.split('function TwitchMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(twitchFn).not.toMatch(/Verificar misi[oó]n/);
  });

  it('TwitchMissionsPlaceholder tiene link "Ver Twitch →" con target=_blank y rel=noopener noreferrer', () => {
    const twitchFn = source.split('function TwitchMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(twitchFn).toMatch(/Ver Twitch/);
    expect(twitchFn).toMatch(/target="_blank"/);
    expect(twitchFn).toMatch(/rel="noopener noreferrer"/);
  });

  it('TwitchMissionsPlaceholder link solo aparece si channelUrl no es null', () => {
    const twitchFn = source.split('function TwitchMissionsPlaceholder')[1]?.split('function ')[0] ?? '';
    expect(twitchFn).toMatch(/channelUrl \?/);
  });

  it('TwitchMissionsPlaceholder incluye copy exacto del brief', () => {
    expect(source).toContain('Sigue el canal de ZACKETIZOR y consigue puntos cuando activemos esta misión');
  });
});

describe('MissionsGrid — prioridad de card real sobre placeholder', () => {
  const source = read('src/features/giveaway-platform/components/MissionsGrid.tsx');

  it('renderiza card real cuando discordMissions > 0 && discord — placeholder es fallback', () => {
    // El JSX evalúa primero la condición de la card real:
    //   discordMissions.length > 0 && discord ? <DiscordMissionCard /> : hasDiscordPlaceholder ? <DiscordMissionsPlaceholder /> : null
    expect(source).toMatch(/discordMissions\.length > 0 && discord \? \(/);
    expect(source).toMatch(/\) : hasDiscordPlaceholder \? \(/);
    expect(source).toMatch(/<DiscordMissionsPlaceholder \/>/);
  });

  it('renderiza card real Twitch cuando twitchMissions > 0 && twitch — placeholder es fallback', () => {
    expect(source).toMatch(/twitchMissions\.length > 0 && twitch \? \(/);
    expect(source).toMatch(/\) : hasTwitchPlaceholder \? \(/);
    expect(source).toMatch(/<TwitchMissionsPlaceholder channelUrl=/);
  });

  it('empty state considera también los placeholders (no aparece si hay al menos uno)', () => {
    expect(source).toMatch(/hasDiscordPlaceholder/);
    expect(source).toMatch(/hasTwitchPlaceholder/);
    expect(source).toMatch(/hasAnyCard = hasDiscordCard \|\| hasTwitchCard \|\| hasInternalCard \|\| hasDiscordPlaceholder \|\| hasTwitchPlaceholder/);
  });
});

describe('PlatformCreatorLanding — cableado del flag coming_soon', () => {
  const source = read('src/features/giveaway-platform/components/PlatformCreatorLanding.tsx');

  it('importa isDiscordComingSoon', () => {
    expect(source).toMatch(/isDiscordComingSoon/);
  });

  it('importa isTwitchComingSoon y getTwitchPublicChannelUrl', () => {
    expect(source).toMatch(/isTwitchComingSoon/);
    expect(source).toMatch(/getTwitchPublicChannelUrl/);
  });

  it('discordComingSoon solo se activa cuando discordProp está undefined Y el creador es coming_soon', () => {
    expect(source).toMatch(/const discordComingSoon = !discordProp && isDiscordComingSoon\(active\.slug\)/);
  });

  it('twitchComingSoon solo se activa cuando twitchProp está undefined Y el creador es coming_soon', () => {
    expect(source).toMatch(/const twitchComingSoon = !twitchProp && isTwitchComingSoon\(active\.slug\)/);
  });

  it('pasa los flags a MissionsGrid', () => {
    expect(source).toMatch(/discordComingSoon=\{discordComingSoon\}/);
    expect(source).toMatch(/twitchComingSoon=\{twitchComingSoon\}/);
  });
});

describe('Regresión — sin migración ni server actions nuevas', () => {
  // Refactorizado tras 0110 (aditiva, otra PR): comprobamos que no hay
  // migración nueva del ámbito de esta PR (social missions coming soon).
  const SCOPE_RE = /^\d{4}_.*(social[_-]?mission|discord|twitch|youtube|coming[_-]?soon|placeholder)/i;

  it('no aparecen migraciones nuevas del ámbito social missions', () => {
    const files = fs.readdirSync(path.join(ROOT, 'drizzle')).filter((f) => /^\d{4}_.*\.sql$/.test(f));
    for (const f of files.filter((x) => SCOPE_RE.test(x))) {
      const idx = Number(f.substring(0, 4));
      expect(idx).toBeLessThanOrEqual(109);
    }
  });

  it('discord-mission-action.ts sigue con 1 export (verifyDiscordMission)', () => {
    const source = read('src/app/sorteos/plataforma/discord-mission-action.ts');
    const exports = source.match(/^export\s+async\s+function\s+\w+/gm) ?? [];
    expect(exports).toHaveLength(1);
    expect(exports[0]).toMatch(/verifyDiscordMission/);
  });

  it('twitch-mission-action.ts sigue con 1 export (verifyTwitchMission)', () => {
    const source = read('src/app/sorteos/plataforma/twitch-mission-action.ts');
    const exports = source.match(/^export\s+async\s+function\s+\w+/gm) ?? [];
    expect(exports).toHaveLength(1);
    expect(exports[0]).toMatch(/verifyTwitchMission/);
  });
});

describe('CSS placeholder social', () => {
  it('platform-missions-social-placeholder.css existe y define variantes Discord/Twitch', () => {
    const cssPath = 'src/app/sorteos/plataforma/platform-missions-social-placeholder.css';
    expect(fs.existsSync(path.join(ROOT, cssPath))).toBe(true);
    const css = read(cssPath);
    expect(css).toMatch(/\.giveaway-platform \.gp-missions-social-placeholder/);
    expect(css).toMatch(/\.is-discord/);
    expect(css).toMatch(/\.is-twitch/);
  });

  it('el CSS se carga desde el layout de sorteos', () => {
    const layout = read('src/app/sorteos/layout.tsx');
    expect(layout).toMatch(/platform-missions-social-placeholder\.css/);
  });
});
