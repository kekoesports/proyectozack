/**
 * Contratos estructurales de la visualización de participantes en la
 * ExternalGiveawayCard.
 *
 * Verifica:
 *  - Bloque .gp-external-participants con count grande + label.
 *  - Progressbar accesible con aria-valuenow/min/max cuando faltan users.
 *  - Etiqueta "arranca en N más" solo cuando participantCount < minUsers.
 *  - Etiqueta "Mínimo alcanzado" cuando ≥ minUsers.
 *  - CSS con gradient bar naranja→pink y count grande en sp-pink.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('[participants-visual] componente', () => {
  const src = read('src/features/giveaway-platform/components/ExternalGiveawayCard.tsx');

  it('bloque .gp-external-participants existe', () => {
    expect(src).toMatch(/className="gp-external-participants"/);
    expect(src).toMatch(/gp-external-participants-count/);
    expect(src).toMatch(/gp-external-participants-label/);
  });

  it('count muestra participantCount con toLocaleString es-ES', () => {
    expect(src).toMatch(/card\.participantCount\.toLocaleString\('es-ES'\)/);
  });

  it('progressbar con aria completo cuando faltan users', () => {
    expect(src).toMatch(/role="progressbar"/);
    expect(src).toMatch(/aria-valuenow=\{card\.participantCount\}/);
    expect(src).toMatch(/aria-valuemin=\{0\}/);
    expect(src).toMatch(/aria-valuemax=\{card\.minUsers\}/);
  });

  it('width fill = participantCount/minUsers * 100 clamped a 100', () => {
    expect(src).toMatch(/Math\.min\(100,\s*Math\.round\(\(card\.participantCount\s*\/\s*card\.minUsers\)\s*\*\s*100\)\)/);
  });

  it('condiciones: falta users → progressbar; ≥ minUsers → "Mínimo alcanzado"', () => {
    expect(src).toMatch(/card\.minUsers\s*>\s*0\s*&&\s*card\.participantCount\s*<\s*card\.minUsers/);
    expect(src).toMatch(/Mínimo alcanzado/);
  });

  it('etiqueta "Arranca en N más" con la resta minUsers - participantCount', () => {
    expect(src).toMatch(/Arranca en\s*\{[\s\S]{0,120}card\.minUsers\s*-\s*card\.participantCount/);
  });

  it('bloque antiguo gp-sorteo-meta con participantes ha sido reemplazado', () => {
    expect(src).not.toMatch(/gp-sorteo-meta[\s\S]{0,200}participantes/);
  });
});

describe('[participants-visual] CSS', () => {
  const css = read('src/app/sorteos/plataforma/platform-external-giveaways.css');

  it('.gp-external-participants-count usa sp-pink + font-display', () => {
    expect(css).toMatch(/\.gp-external-participants-count\s*\{[\s\S]{0,300}var\(--sp-pink\)/);
    expect(css).toMatch(/\.gp-external-participants-count\s*\{[\s\S]{0,300}var\(--font-display\)/);
  });

  it('.gp-external-participants-bar-fill usa gradient naranja→pink', () => {
    expect(css).toMatch(/\.gp-external-participants-bar-fill\s*\{[\s\S]{0,300}linear-gradient\([\s\S]{0,80}var\(--sp-orange\)[\s\S]{0,80}var\(--sp-pink\)/);
  });

  it('.gp-external-participants-ready usa verde (#4ade80)', () => {
    expect(css).toMatch(/\.gp-external-participants-ready\s*\{[\s\S]{0,200}#4ade80/);
  });
});
