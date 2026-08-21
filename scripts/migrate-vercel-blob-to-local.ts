/**
 * Copia los ficheros de Vercel Blob al almacenamiento local. NO BORRA NADA.
 *
 * Idempotente: se puede ejecutar cuantas veces haga falta. Un fichero ya
 * copiado y con el checksum correcto se salta; uno copiado a medias se vuelve a
 * bajar. Eso importa porque con miles de objetos la primera pasada casi nunca
 * termina limpia —hay tiempos de espera agotados, cortes, límites de tasa— y la
 * alternativa sería empezar de cero cada vez.
 *
 * Lo que NUNCA hace:
 *   · borrar en Vercel
 *   · sobrescribir un fichero local cuyo contenido difiere
 *   · tocar la base de datos
 *
 *   npx tsx scripts/migrate-vercel-blob-to-local.ts            (dry run)
 *   npx tsx scripts/migrate-vercel-blob-to-local.ts --apply
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { head, list } from '@vercel/blob';

const APLICAR = process.argv.includes('--apply');
const RAIZ = process.env.STORAGE_LOCAL_ROOT ?? '/srv/socialpro/storage';

/**
 * Qué es público y qué privado.
 *
 * Equivocarse aquí en el sentido peligroso —marcar como público algo privado—
 * expondría facturas o contratos, así que la lista es explícita: todo lo que no
 * esté aquí se trata como privado. Es preferible que una foto acabe detrás de
 * permisos a que un contrato acabe accesible por URL.
 */
const PREFIJOS_PUBLICOS = new Set(['news', 'covers', 'og']);

type Resultado = 'copiado' | 'ya_estaba' | 'difiere' | 'fallo';

type Registro = {
  readonly legacyPathname: string;
  readonly storageKey: string;
  readonly visibilidad: 'public' | 'private';
  readonly bytes: number;
  readonly checksum: string;
  readonly resultado: Resultado;
  readonly detalle?: string;
};

function visibilidadDe(pathname: string): 'public' | 'private' {
  const prefijo = pathname.split('/')[0] ?? '';
  return PREFIJOS_PUBLICOS.has(prefijo) ? 'public' : 'private';
}

/** Se conserva el pathname lógico: así la URL antigua sigue siendo rastreable. */
function rutaLocal(pathname: string, visibilidad: 'public' | 'private'): string {
  const base = resolve(join(RAIZ, visibilidad));
  const destino = resolve(join(base, pathname));
  // Un pathname de Vercel es dato externo: podría traer '..'.
  if (destino !== base && !destino.startsWith(base + sep)) {
    throw new Error(`pathname sospechoso: ${pathname}`);
  }
  return destino;
}

const sha256 = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

async function copiarUno(pathname: string, token: string): Promise<Registro> {
  const visibilidad = visibilidadDe(pathname);
  const destino = rutaLocal(pathname, visibilidad);

  const meta = await head(pathname, { token });
  const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    return {
      legacyPathname: pathname, storageKey: pathname, visibilidad,
      bytes: 0, checksum: '', resultado: 'fallo', detalle: `descarga ${res.status}`,
    };
  }
  const datos = Buffer.from(await res.arrayBuffer());
  const checksum = sha256(datos);

  // ¿Ya está? Se compara por contenido, no por tamaño: dos ficheros del mismo
  // tamaño pueden ser distintos, y una copia truncada suele pasar el test de
  // "existe y pesa parecido".
  try {
    await stat(destino);
    const actual = await readFile(destino);
    if (sha256(actual) === checksum) {
      return {
        legacyPathname: pathname, storageKey: pathname, visibilidad,
        bytes: datos.byteLength, checksum, resultado: 'ya_estaba',
      };
    }
    // Existe con otro contenido. NO se sobrescribe: sobrescribir aquí podría
    // destruir algo subido después de empezar la copia.
    return {
      legacyPathname: pathname, storageKey: pathname, visibilidad,
      bytes: datos.byteLength, checksum, resultado: 'difiere',
      detalle: 'existe con contenido distinto — revisar a mano',
    };
  } catch {
    // no existe: continuar
  }

  if (APLICAR) {
    await mkdir(dirname(destino), { recursive: true, mode: 0o750 });
    // Temporal y rename, para que un corte no deje un fichero a medias que
    // parezca bueno en la siguiente pasada.
    const temporal = `${destino}.${randomUUID()}.tmp`;
    await writeFile(temporal, datos, { mode: 0o640 });
    await rename(temporal, destino);
  }

  return {
    legacyPathname: pathname, storageKey: pathname, visibilidad,
    bytes: datos.byteLength, checksum, resultado: 'copiado',
  };
}

async function main(): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('falta BLOB_READ_WRITE_TOKEN');

  console.error(APLICAR ? '=== COPIANDO ===' : '=== DRY RUN (nada se escribe) ===');

  const registros: Registro[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await list({ token, limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const b of pagina.blobs) {
      try {
        const r = await copiarUno(b.pathname, token);
        registros.push(r);
        if (r.resultado === 'difiere' || r.resultado === 'fallo') {
          console.error(`  ${r.resultado.toUpperCase()}: ${b.pathname} — ${r.detalle ?? ''}`);
        }
      } catch (e) {
        registros.push({
          legacyPathname: b.pathname, storageKey: b.pathname,
          visibilidad: visibilidadDe(b.pathname), bytes: 0, checksum: '',
          resultado: 'fallo', detalle: e instanceof Error ? e.message : 'error',
        });
      }
    }
    cursor = pagina.cursor;
  } while (cursor);

  const cuenta = (r: Resultado): number => registros.filter((x) => x.resultado === r).length;
  const bytes = registros.reduce((s, r) => s + r.bytes, 0);

  console.error('\n=== RESUMEN ===');
  console.error(`  copiados   : ${cuenta('copiado')}`);
  console.error(`  ya estaban : ${cuenta('ya_estaba')}`);
  console.error(`  DIFIEREN   : ${cuenta('difiere')}   <-- revisar a mano`);
  console.error(`  fallos     : ${cuenta('fallo')}`);
  console.error(`  total      : ${registros.length} objetos, ${(bytes / 1048576).toFixed(1)} MB`);
  if (!APLICAR) console.error('\n  (dry run: no se ha escrito nada)');

  // El mapa es lo que permite cotejar después y, si hiciera falta, deshacer.
  process.stdout.write(JSON.stringify({
    generadoEn: new Date().toISOString(),
    aplicado: APLICAR,
    registros,
  }, null, 2));
}

main().catch((e) => {
  console.error('FALLO:', e instanceof Error ? e.message : e);
  process.exit(1);
});
