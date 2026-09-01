/**
 * Inventario de Vercel Blob. SOLO LECTURA — no borra ni modifica nada.
 *
 * Primer paso de la migración de ficheros: saber exactamente qué hay antes de
 * mover un byte. Produce un CSV con un registro por objeto y un resumen por
 * prefijo, para poder cotejar después que la copia está completa.
 *
 *   npx tsx scripts/inventory-vercel-blob.ts > inventario.json
 */
import { list } from '@vercel/blob';

type Objeto = {
  pathname: string;
  size: number;
  uploadedAt: string;
  prefijo: string;
};

const TOKENS = [
  { nombre: 'principal', token: process.env.BLOB_READ_WRITE_TOKEN },
  { nombre: 'news', token: process.env.BLOB_NEWS_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_NEWS },
];

/** El primer segmento de la ruta agrupa por tipo: invoices/, talents/… */
function prefijoDe(pathname: string): string {
  const i = pathname.indexOf('/');
  return i === -1 ? '(raíz)' : pathname.slice(0, i);
}

async function inventariar(nombre: string, token: string): Promise<Objeto[]> {
  const objetos: Objeto[] = [];
  let cursor: string | undefined;
  do {
    // `list` pagina: sin el bucle solo se ven los primeros 1000 y el inventario
    // saldría incompleto sin avisar.
    const pagina = await list({ token, limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const b of pagina.blobs) {
      objetos.push({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt.toISOString(),
        prefijo: prefijoDe(b.pathname),
      });
    }
    cursor = pagina.cursor;
  } while (cursor);
  console.error(`  store ${nombre}: ${objetos.length} objetos`);
  return objetos;
}

async function main(): Promise<void> {
  const todos: Record<string, Objeto[]> = {};
  for (const { nombre, token } of TOKENS) {
    if (!token) {
      console.error(`  store ${nombre}: sin token, se omite`);
      continue;
    }
    todos[nombre] = await inventariar(nombre, token);
  }

  const planos = Object.values(todos).flat();
  const porPrefijo = new Map<string, { n: number; bytes: number }>();
  for (const o of planos) {
    const acc = porPrefijo.get(o.prefijo) ?? { n: 0, bytes: 0 };
    porPrefijo.set(o.prefijo, { n: acc.n + 1, bytes: acc.bytes + o.size });
  }

  // Los prefijos que se descubren por `list()` y no tienen fila en base de
  // datos son el punto delicado de toda la migración: si se copian sin
  // construir antes un índice, quedan ficheros que nadie sabe asociar.
  const SIN_INDICE = ['talents', 'team', 'brands'];

  console.error('\n  resumen por prefijo:');
  for (const [p, v] of [...porPrefijo.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
    const aviso = SIN_INDICE.includes(p) ? '  <-- sin fila en DB' : '';
    console.error(`    ${p.padEnd(20)} ${String(v.n).padStart(5)} obj  ${(v.bytes / 1048576).toFixed(1).padStart(8)} MB${aviso}`);
  }
  console.error(`\n  TOTAL: ${planos.length} objetos, ${(planos.reduce((s, o) => s + o.size, 0) / 1048576).toFixed(1)} MB`);

  process.stdout.write(JSON.stringify({
    generadoEn: new Date().toISOString(),
    stores: todos,
    resumen: Object.fromEntries(porPrefijo),
  }, null, 2));
}

main().catch((e) => {
  console.error('FALLO:', e instanceof Error ? e.message : e);
  process.exit(1);
});
