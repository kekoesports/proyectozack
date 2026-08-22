/**
 * Guard contra migraciones que el migrador saltaría en silencio.
 *
 * El caso que motiva esto: el 2026-08-20 la migración 0120 nació con un `when`
 * por debajo del último `created_at` de la base, Drizzle la dio por aplicada y
 * el deploy terminó en verde sin aplicarla. Se detectó consultando la base.
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { checkMigrationsWillApply } from '../../../scripts/migration-skip-guard';

type Entry = { idx: number; when: number; tag: string };

/** Monta un directorio de migraciones de mentira con el journal indicado. */
function montarFolder(entries: Entry[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'guard-'));
  mkdirSync(join(dir, 'meta'), { recursive: true });
  writeFileSync(join(dir, 'meta', '_journal.json'), JSON.stringify({ entries }));
  for (const e of entries) writeFileSync(join(dir, `${e.tag}.sql`), `-- ${e.tag}`);
  return dir;
}

/** Cliente de pega con la forma mínima que pide el guard: `query()` -> `{ rows }`. */
function sqlQueDevuelve(rows: { created_at: string }[] | 'error') {
  return {
    query: async () => {
      if (rows === 'error') throw new Error('relation does not exist');
      return { rows };
    },
  };
}

const creados: string[] = [];
afterAll(() => {
  for (const d of creados) rmSync(d, { recursive: true, force: true });
});

function folderCon(entries: Entry[]): string {
  const d = montarFolder(entries);
  creados.push(d);
  return d;
}

describe('checkMigrationsWillApply', () => {
  it('deja pasar cuando la pendiente supera el suelo', async () => {
    const dir = folderCon([
      { idx: 0, when: 1000, tag: '0000_a' },
      { idx: 1, when: 3000, tag: '0001_b' },
    ]);
    const out = await checkMigrationsWillApply(sqlQueDevuelve([{ created_at: '1000' }]), dir);
    expect(out).toEqual({ ok: true, pendientes: 1 });
  });

  it('DETIENE el deploy cuando una pendiente nace por debajo del suelo', async () => {
    // 0001_b (when=1500) es posterior en el journal pero nació por debajo del
    // created_at de 0000_a (2000): Drizzle la daría por aplicada y seguiría.
    const dir = folderCon([
      { idx: 0, when: 2000, tag: '0000_a' },
      { idx: 1, when: 1500, tag: '0001_b' },
    ]);
    const out = await checkMigrationsWillApply(sqlQueDevuelve([{ created_at: '2000' }]), dir);
    expect(out).toEqual({ ok: false, suelo: 2000, saltadas: [{ tag: '0001_b', when: 1500 }] });
  });

  it('detecta el suelo aunque venga de una migración que el journal no conoce', async () => {
    // El caso real: otra rama aplicó una migración que este checkout no tiene.
    // Un test que solo mirase el journal daría esto por bueno.
    const dir = folderCon([
      { idx: 0, when: 1000, tag: '0000_a' },
      { idx: 1, when: 2000, tag: '0001_nueva' },
    ]);
    const out = await checkMigrationsWillApply(
      sqlQueDevuelve([{ created_at: '1000' }, { created_at: '5000' }]),
      dir,
    );
    expect(out).toEqual({ ok: false, suelo: 5000, saltadas: [{ tag: '0001_nueva', when: 2000 }] });
  });

  it('no se queja de las ya aplicadas, aunque estén por debajo del suelo', async () => {
    const dir = folderCon([
      { idx: 0, when: 1000, tag: '0000_a' },
      { idx: 1, when: 2000, tag: '0001_b' },
    ]);
    const out = await checkMigrationsWillApply(
      sqlQueDevuelve([{ created_at: '1000' }, { created_at: '2000' }]),
      dir,
    );
    expect(out).toEqual({ ok: true, pendientes: 0 });
  });

  it('identifica lo aplicado por created_at, no por el hash del fichero', async () => {
    // El hash se calcula sobre el contenido del .sql, y en Windows los finales
    // de línea son CRLF mientras que el deploy lo aplicó con LF: comparando por
    // hash, todas las migraciones parecerían pendientes y el guard abortaría
    // cualquier deploy. Aquí el contenido es irrelevante y aun así acierta.
    const dir = folderCon([{ idx: 0, when: 1000, tag: '0000_a' }]);
    writeFileSync(join(dir, '0000_a.sql'), 'contenido\r\ncompletamente\r\ndistinto');
    const out = await checkMigrationsWillApply(sqlQueDevuelve([{ created_at: '1000' }]), dir);
    expect(out).toEqual({ ok: true, pendientes: 0 });
  });

  it('con la base sin inicializar, no bloquea', async () => {
    const dir = folderCon([{ idx: 0, when: 1000, tag: '0000_a' }]);
    const out = await checkMigrationsWillApply(sqlQueDevuelve('error'), dir);
    expect(out).toEqual({ ok: true, pendientes: 1 });
  });

  it('lista todas las que se saltarían, no solo la primera', async () => {
    const dir = folderCon([
      { idx: 0, when: 9000, tag: '0000_alta' },
      { idx: 1, when: 100, tag: '0001_baja' },
      { idx: 2, when: 200, tag: '0002_baja' },
    ]);
    const out = await checkMigrationsWillApply(sqlQueDevuelve([{ created_at: '9000' }]), dir);
    expect(out.ok).toBe(false);
    if (out.ok) throw new Error('debía fallar');
    expect(out.saltadas.map((s) => s.tag)).toEqual(['0001_baja', '0002_baja']);
  });
});
