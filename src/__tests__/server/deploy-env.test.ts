/**
 * Entorno de despliegue portable.
 *
 * El caso que motiva esto: los guards leían `VERCEL_ENV`, y fuera de Vercel esa
 * variable no existe. No fallaban — dejaban de aplicarse. Migraciones en
 * preview y pings de IndexNow desde staging, sin aviso.
 */

import {
  getDeployEnv,
  isProductionDeploy,
  isPreviewDeploy,
  isAutomatedEnvironment,
} from '@/lib/deploy-env';

const ORIGINAL = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL };
  delete process.env.DEPLOY_ENV;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL;
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.DEPLOY_RUNNER;
  // NODE_ENV es readonly en los tipos de Node: se reconstruye el objeto sin él.
  const { NODE_ENV: _omitido, ...resto } = process.env;
  process.env = resto as NodeJS.ProcessEnv;
});

afterAll(() => {
  process.env = ORIGINAL;
});

describe('getDeployEnv', () => {
  it('sin ninguna variable cae a development, no a production', () => {
    // Es lo que hace que los guards sigan protegiendo fuera de Vercel.
    expect(getDeployEnv()).toBe('development');
    expect(isProductionDeploy()).toBe(false);
  });

  it('DEPLOY_ENV manda sobre VERCEL_ENV', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.DEPLOY_ENV = 'preview';
    expect(getDeployEnv()).toBe('preview');
  });

  it('usa VERCEL_ENV mientras producción siga en Vercel', () => {
    process.env.VERCEL_ENV = 'production';
    expect(getDeployEnv()).toBe('production');
    expect(isProductionDeploy()).toBe(true);
  });

  it('tolera mayúsculas y espacios', () => {
    process.env.DEPLOY_ENV = '  PRODUCTION ';
    expect(getDeployEnv()).toBe('production');
  });

  it('un valor desconocido no se toma por bueno', () => {
    process.env.DEPLOY_ENV = 'staging-raro';
    expect(getDeployEnv()).toBe('development');
  });

  it('distingue preview', () => {
    process.env.DEPLOY_ENV = 'preview';
    expect(isPreviewDeploy()).toBe(true);
    expect(isProductionDeploy()).toBe(false);
  });
});

describe('isAutomatedEnvironment', () => {
  it('en una máquina de desarrollo es false', () => {
    expect(isAutomatedEnvironment()).toBe(false);
  });

  it.each([
    ['CI', 'true'],
    ['GITHUB_ACTIONS', 'true'],
    ['VERCEL', '1'],
    ['DEPLOY_RUNNER', '1'],
    ['NODE_ENV', 'production'],
  ])('detecta %s', (clave, valor) => {
    process.env = { ...process.env, [clave]: valor };
    expect(isAutomatedEnvironment()).toBe(true);
  });

  it('sigue protegiendo fuera de Vercel', () => {
    // Antes la única señal era VERCEL === '1'. En el VPS habría dado false y
    // los scripts destructivos se habrían quedado sin guardia.
    process.env.DEPLOY_RUNNER = '1';
    expect(isAutomatedEnvironment()).toBe(true);
  });
});
