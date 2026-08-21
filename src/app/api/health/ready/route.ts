import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * ¿Puede atender peticiones?
 *
 * Comprueba las dependencias que, si fallan, hacen inútil al proceso aunque
 * esté vivo. A diferencia de `/live`, **este sí toca la base** — pero con
 * timeout propio: un check de salud que se queda colgado esperando a Postgres
 * es peor que uno que dice "no listo", porque el balanceador no recibe
 * respuesta y decide por su cuenta.
 *
 * Devuelve 503 cuando algo esencial falla, para que un balanceador lo saque de
 * rotación sin que Docker lo reinicie.
 *
 * No expone versiones, cadenas de conexión ni nombres de host: un endpoint de
 * salud es público de hecho aunque no lo sea de derecho.
 */

const TIMEOUT_MS = 2_000;

type Comprobacion = {
  readonly name: string;
  readonly ok: boolean;
  readonly ms: number;
};

async function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_, reject) => {
        temporizador = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  } finally {
    if (temporizador !== undefined) clearTimeout(temporizador);
  }
}

async function comprobarBase(): Promise<Comprobacion> {
  const inicio = Date.now();
  try {
    await conTimeout(db.execute(sql`select 1`), TIMEOUT_MS);
    return { name: 'database', ok: true, ms: Date.now() - inicio };
  } catch {
    return { name: 'database', ok: false, ms: Date.now() - inicio };
  }
}

/**
 * Que las migraciones se hayan aplicado alguna vez.
 *
 * No comprueba que estén **al día** —eso exigiría leer el journal desde el
 * runtime y compararlo, y un despliegue a medias daría un falso rojo—, sino
 * que la tabla de control existe. Su ausencia significa que la base se
 * provisionó fuera de Drizzle, que es un problema real y silencioso.
 */
async function comprobarMigraciones(): Promise<Comprobacion> {
  const inicio = Date.now();
  try {
    await conTimeout(
      db.execute(sql`select 1 from drizzle.__drizzle_migrations limit 1`),
      TIMEOUT_MS,
    );
    return { name: 'migrations', ok: true, ms: Date.now() - inicio };
  } catch {
    return { name: 'migrations', ok: false, ms: Date.now() - inicio };
  }
}

export async function GET(): Promise<NextResponse> {
  const comprobaciones = await Promise.all([comprobarBase(), comprobarMigraciones()]);
  const listo = comprobaciones.every((c) => c.ok);

  return NextResponse.json(
    {
      status: listo ? 'ready' : 'not-ready',
      ts: new Date().toISOString(),
      checks: comprobaciones,
    },
    {
      status: listo ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
