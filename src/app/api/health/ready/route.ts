/**
 * Readiness: ¿puede este proceso atender tráfico?
 *
 * Comprueba lo que la aplicación necesita de verdad para servir una petición:
 * base de datos, almacenamiento y estado de las migraciones. A diferencia de
 * `live`, aquí un fallo SÍ debe sacar la instancia del balanceo.
 *
 * Cada comprobación lleva su propio timeout corto: un readiness que se queda
 * colgado es peor que uno que falla, porque el orquestador no puede decidir.
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3000;

type Check = { readonly name: string; readonly ok: boolean; readonly detail?: string };

async function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout tras ${ms}ms`)), ms),
    ),
  ]);
}

async function comprobarBaseDeDatos(): Promise<Check> {
  try {
    await conTimeout(db.execute(sql`SELECT 1`), TIMEOUT_MS);
    return { name: 'database', ok: true };
  } catch (err) {
    // El mensaje puede traer la cadena de conexión: no se propaga.
    return { name: 'database', ok: false, detail: err instanceof Error ? err.name : 'error' };
  }
}

async function comprobarMigraciones(): Promise<Check> {
  try {
    const filas = await conTimeout(
      db.execute<{ n: number }>(
        sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`,
      ),
      TIMEOUT_MS,
    );
    const conRows = filas as unknown as { rows?: { n: number }[] };
    const lista: { n: number }[] = Array.isArray(filas)
      ? (filas as unknown as { n: number }[])
      : (conRows.rows ?? []);
    const n = lista[0]?.n;
    if (typeof n !== 'number' || n === 0) {
      return { name: 'migrations', ok: false, detail: 'sin migraciones registradas' };
    }
    return { name: 'migrations', ok: true, detail: `${n} aplicadas` };
  } catch (err) {
    return { name: 'migrations', ok: false, detail: err instanceof Error ? err.name : 'error' };
  }
}

async function comprobarAlmacenamiento(): Promise<Check> {
  // Con el driver local se comprueba que el directorio es escribible; con
  // Vercel Blob basta con que el token esté configurado, porque una llamada
  // real a la API en cada readiness sería cara y añadiría una dependencia de
  // red a algo que debe responder rápido.
  const driver = process.env.STORAGE_DRIVER ?? 'vercel';
  if (driver === 'local') {
    try {
      const { access, constants } = await import('node:fs/promises');
      const raiz = process.env.STORAGE_LOCAL_ROOT ?? '/srv/socialpro/storage';
      await conTimeout(access(raiz, constants.W_OK), TIMEOUT_MS);
      return { name: 'storage', ok: true, detail: 'local' };
    } catch {
      return { name: 'storage', ok: false, detail: 'local no escribible' };
    }
  }
  const hayToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  return { name: 'storage', ok: hayToken, detail: hayToken ? 'vercel' : 'vercel sin token' };
}

export async function GET(): Promise<NextResponse> {
  const checks = await Promise.all([
    comprobarBaseDeDatos(),
    comprobarMigraciones(),
    comprobarAlmacenamiento(),
  ]);

  const ok = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      status: ok ? 'ready' : 'not_ready',
      version: process.env.APP_VERSION ?? 'unknown',
      commit: process.env.GIT_COMMIT_SHA ?? 'unknown',
      checks,
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
