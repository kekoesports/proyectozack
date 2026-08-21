import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * ¿Está vivo el proceso?
 *
 * **No toca la base de datos, y eso es el punto entero.** Docker reinicia el
 * contenedor cuando este check falla; si comprobara Postgres, una caída de la
 * base haría que Docker reiniciara en bucle un contenedor perfectamente sano,
 * y al volver la base se encontraría con un servicio que lleva veinte
 * reinicios. Ver `infra/agents/README.md`.
 *
 * Para saber si puede atender peticiones de verdad está `/api/health/ready`.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'live', ts: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
