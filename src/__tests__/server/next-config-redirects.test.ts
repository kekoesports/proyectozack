/**
 * Auditoría estática de redirects en next.config.ts.
 *
 * Garantiza que el redirect canónico de TIGERR no se invierta accidentalmente:
 *   ✅ /talentos/tiger  → /talentos/tigerr
 *   ❌ /talentos/tigerr → /talentos/tiger  (rompería el perfil)
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const NEXT_CONFIG = path.join(PROJECT_ROOT, 'next.config.ts');

describe('next.config.ts — redirects de talentos', () => {
  const content = fs.readFileSync(NEXT_CONFIG, 'utf-8');

  it('contiene redirect /talentos/tiger → /talentos/tigerr', () => {
    // Tolerante a whitespace y comillas simples/dobles entre source/destination
    const pattern = /source:\s*['"]\/talentos\/tiger['"][\s\S]{0,200}?destination:\s*['"]\/talentos\/tigerr['"]/;
    expect(content).toMatch(pattern);
  });

  it('NO contiene redirect inverso /talentos/tigerr → /talentos/tiger', () => {
    const pattern = /source:\s*['"]\/talentos\/tigerr['"][\s\S]{0,200}?destination:\s*['"]\/talentos\/tiger['"]/;
    expect(content).not.toMatch(pattern);
  });

  it('el redirect canónico es permanente (301/308)', () => {
    const block = /source:\s*['"]\/talentos\/tiger['"][\s\S]{0,300}?permanent:\s*true/;
    expect(content).toMatch(block);
  });
});
