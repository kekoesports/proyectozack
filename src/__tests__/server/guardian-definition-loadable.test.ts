/**
 * `definition.ts` tiene que poder cargarse fuera de Next.
 *
 * Lo carga `seed-guardian-schedules.ts`, que es un script de Node corriente. Si
 * arrastra un módulo con `server-only`, el seed muere con un error que habla de
 * Client Components y no dice nada del problema real. Pasó de verdad: se
 * descubrió al ejecutar el seed por primera vez, después de mergear.
 *
 * Este test es el canario. **No** se mockea `server-only` a propósito: mockearlo
 * haría pasar el test justo en el caso que debe detectar.
 */

jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import fs from 'fs';
import path from 'path';

import {
  GUARDIAN_ALLOWLIST,
  GUARDIAN_SCHEDULES,
  GUARDIAN_TOOL_NAMES,
} from '@/lib/agents/guardian/definition';

describe('definition.ts se carga sin Next', () => {
  it('se importa sin lanzar', () => {
    // Si `definition.ts` volviera a importar `tools.ts`, este import fallaría
    // al cargar el módulo y la suite entera se caería aquí.
    expect(GUARDIAN_SCHEDULES.length).toBe(2);
    expect(GUARDIAN_ALLOWLIST.length).toBeGreaterThan(0);
  });

  it('ni él ni lo que importa llevan server-only', () => {
    const raiz = path.resolve(__dirname, '..', '..', '..');

    /**
     * Se mira el import, no la palabra: estos ficheros **explican** en sus
     * comentarios por qué evitan `server-only`, y buscar la cadena suelta los
     * marcaría como culpables por documentarse.
     */
    const importaServerOnly = (rel: string): boolean =>
      /^\s*import\s+['"]server-only['"]/m.test(fs.readFileSync(path.join(raiz, rel), 'utf-8'));

    expect(importaServerOnly('src/lib/agents/guardian/definition.ts')).toBe(false);
    // Su única dependencia es `prompt.ts`; se comprueba también.
    expect(importaServerOnly('src/lib/agents/guardian/prompt.ts')).toBe(false);
    expect(importaServerOnly('src/lib/agents/redaction.ts')).toBe(false);

    const definicion = fs.readFileSync(
      path.join(raiz, 'src/lib/agents/guardian/definition.ts'),
      'utf-8',
    );
    expect(definicion).not.toMatch(/^\s*import[\s\S]{0,80}from '\.\/tools'/m);
  });

  it('el seed solo importa de definition, no de tools', () => {
    const seed = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'scripts/seed-guardian-schedules.ts'),
      'utf-8',
    );
    expect(seed).toMatch(/guardian\/definition/);
    expect(seed).not.toMatch(/guardian\/tools/);
  });
});

describe('los nombres declarados y los implementados no se separan', () => {
  it('coinciden exactamente', async () => {
    // Los nombres viven en `definition.ts` para que el seed pueda leerlos; las
    // implementaciones, en `tools.ts`. Este test es lo que impide que
    // diverjan — añadir una tool sin ponerla en la lista la dejaría fuera de la
    // allowlist de Guardian, y el executor la bloquearía sin explicar por qué.
    jest.doMock('server-only', () => ({}));
    const { GUARDIAN_TOOLS } = await import('@/lib/agents/guardian/tools');

    expect(GUARDIAN_TOOLS.map((t) => t.name).sort()).toEqual([...GUARDIAN_TOOL_NAMES].sort());
  });
});
