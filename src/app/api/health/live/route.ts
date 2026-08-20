/**
 * Liveness: ¿el proceso responde?
 *
 * No toca la base de datos ni ninguna dependencia externa a propósito. Si este
 * endpoint fallara por una base caída, el orquestador reiniciaría un contenedor
 * que está perfectamente sano y no arreglaría nada. Para eso está `ready`.
 *
 * No expone secretos: solo versión, commit y tiempo en marcha.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: 'ok',
      // Inyectados en el build de la imagen; 'unknown' fuera de Docker.
      version: process.env.APP_VERSION ?? 'unknown',
      commit: process.env.GIT_COMMIT_SHA ?? 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
