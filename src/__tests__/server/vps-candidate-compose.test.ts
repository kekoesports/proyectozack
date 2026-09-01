import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('VPS candidate compose', () => {
  const source = readFileSync(resolve('infra/crm/compose.candidate.yaml'), 'utf8');

  it('starts only the candidate application', () => {
    expect(source).toMatch(/^\s{2}candidate-app:/m);
    expect(source).not.toMatch(/^\s{2}postgres:/m);
    expect(source).not.toMatch(/^\s{2}scheduler:/m);
  });

  it('reuses the existing private database and edge networks', () => {
    expect(source).toContain('name: socialpro-crm_crm_backend');
    expect(source).toContain('name: socialpro_edge');
    expect(source).toContain('socialpro-crm-candidate-app');
  });

  it('uses the isolated candidate environment by default', () => {
    expect(source).toContain('${APP_ENV_FILE:-/opt/socialpro/crm/env/candidate-vps.env}');
  });
});
