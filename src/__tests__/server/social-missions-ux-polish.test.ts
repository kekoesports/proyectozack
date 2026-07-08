/**
 * Social missions UX polish — tests estáticos de contrato.
 *
 * Cambios cubiertos:
 *   1. Empty state explícito en MissionsGrid cuando no hay cards visibles.
 *   2. Copy Discord "Entra al servidor y después verifica la misión" en el
 *      estado connected.
 *   3. Rate limit copy más útil en Discord y Twitch (menciona "unos segundos"
 *      + hint específico por provider).
 *   4. Confirmación de que NO hay migración nueva ni server actions nuevas.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('MissionsGrid — empty state explícito', () => {
  const source = read('src/features/giveaway-platform/components/MissionsGrid.tsx');

  it('renderiza contenedor gp-mission-empty con role="status" y aria-live', () => {
    expect(source).toMatch(/className="gp-mission-empty"/);
    expect(source).toMatch(/role="status"/);
    expect(source).toMatch(/aria-live="polite"/);
  });

  it('empty state incluye título y subtítulo diferenciados', () => {
    expect(source).toMatch(/gp-mission-empty-title/);
    expect(source).toMatch(/gp-mission-empty-sub/);
  });

  it('copy "Aún no hay misiones activas para este creador"', () => {
    expect(source).toContain('Aún no hay misiones activas para este creador');
  });

  it('copy "Vuelve pronto — se añaden a lo largo del mes"', () => {
    expect(source).toContain('Vuelve pronto');
    expect(source).toContain('se añaden a lo largo del mes');
  });

  it('empty state considera cards Discord/Twitch reales, no solo missions.length', () => {
    expect(source).toMatch(/hasDiscordCard/);
    expect(source).toMatch(/hasTwitchCard/);
    expect(source).toMatch(/hasInternalCard/);
    expect(source).toMatch(/hasAnyCard/);
  });

  it('NO conserva el texto vago anterior "No hay misiones activas este mes"', () => {
    expect(source).not.toMatch(/No hay misiones activas este mes/);
  });
});

describe('DiscordMissionCard — hint secuencial', () => {
  const source = read('src/features/giveaway-platform/components/DiscordMissionCard.tsx');

  it('renderiza <p className="gp-mission-discord-hint">', () => {
    expect(source).toMatch(/className="gp-mission-discord-hint"/);
  });

  it('copy exacto: "Entra al servidor y después verifica la misión"', () => {
    expect(source).toContain('Entra al servidor y después verifica la misión');
  });

  it('hint solo aparece cuando connected && !showError && !isDone', () => {
    // Test estructural: el hint está dentro de un condicional `connected && !showError`.
    expect(source).toMatch(/connected && !showError \? \([\s\S]*?gp-mission-discord-hint/);
  });
});

describe('Rate limit copy — Discord', () => {
  const source = read('src/app/sorteos/plataforma/discord-mission-action.ts');

  it('menciona "unos segundos" como texto amable', () => {
    expect(source).toContain('Espera unos segundos antes de volver a verificar');
  });

  it('menciona hint específico Discord "acabas de unirte al servidor"', () => {
    expect(source).toContain('acabas de unirte al servidor');
  });

  it('sigue conservando el número de segundos concretos como confirmación', () => {
    expect(source).toMatch(/\$\{RATE_LIMIT_SECONDS\}s/);
  });

  it('NO conserva el texto anterior corto "Espera 30s antes de volver a verificar"', () => {
    expect(source).not.toMatch(/^\s*message:\s*`Espera 30s antes de volver a verificar`/m);
  });
});

describe('Rate limit copy — Twitch', () => {
  const source = read('src/app/sorteos/plataforma/twitch-mission-action.ts');

  it('menciona "unos segundos" como texto amable', () => {
    expect(source).toContain('Espera unos segundos antes de volver a verificar');
  });

  it('menciona hint específico Twitch "acabas de seguir el canal"', () => {
    expect(source).toContain('acabas de seguir el canal');
  });

  it('sigue conservando el número de segundos concretos como confirmación', () => {
    expect(source).toMatch(/\$\{RATE_LIMIT_SECONDS\}s/);
  });
});

describe('CSS — clases añadidas por polish', () => {
  const widgetsCss = read('src/app/sorteos/plataforma/platform-widgets.css');
  const discordCss = read('src/app/sorteos/plataforma/platform-discord-mission.css');

  it('.gp-mission-empty existe en platform-widgets.css', () => {
    expect(widgetsCss).toMatch(/\.giveaway-platform \.gp-mission-empty\s*\{/);
    expect(widgetsCss).toMatch(/\.giveaway-platform \.gp-mission-empty-title\s*\{/);
    expect(widgetsCss).toMatch(/\.giveaway-platform \.gp-mission-empty-sub\s*\{/);
  });

  it('.gp-mission-discord-hint existe en platform-discord-mission.css', () => {
    expect(discordCss).toMatch(/\.giveaway-platform \.gp-mission-discord-hint\s*\{/);
  });
});

describe('Sin migración ni server actions nuevas', () => {
  it('la última migration sigue siendo 0109', () => {
    const files = fs.readdirSync(path.join(ROOT, 'drizzle')).filter((f) => /^\d{4}_.*\.sql$/.test(f));
    const last = files.sort()[files.length - 1];
    expect(last).toBeDefined();
    expect(last!).toMatch(/^0109_/);
  });

  it('no aparece migration 0110/0111 (esta PR es UX puro)', () => {
    const files = fs.readdirSync(path.join(ROOT, 'drizzle'));
    expect(files.find((f) => f.startsWith('0110_'))).toBeUndefined();
    expect(files.find((f) => f.startsWith('0111_'))).toBeUndefined();
  });

  it('discord-mission-action.ts sigue exportando solo verifyDiscordMission (no nuevas actions)', () => {
    const source = read('src/app/sorteos/plataforma/discord-mission-action.ts');
    const exportMatches = source.match(/^export\s+async\s+function\s+\w+/gm) ?? [];
    // Un solo export async function verifyDiscordMission
    expect(exportMatches).toHaveLength(1);
    expect(exportMatches[0]).toMatch(/verifyDiscordMission/);
  });

  it('twitch-mission-action.ts sigue exportando solo verifyTwitchMission', () => {
    const source = read('src/app/sorteos/plataforma/twitch-mission-action.ts');
    const exportMatches = source.match(/^export\s+async\s+function\s+\w+/gm) ?? [];
    expect(exportMatches).toHaveLength(1);
    expect(exportMatches[0]).toMatch(/verifyTwitchMission/);
  });
});
