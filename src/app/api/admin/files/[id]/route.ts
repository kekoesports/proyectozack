import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { requirePermission, type Module } from '@/lib/permissions';
import { db } from '@/lib/db';
import { files } from '@/db/schema/files';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

/**
 * Proxy admin para archivos polimórficos almacenados en Vercel Blob privado.
 *
 * Sirve la fila `files.id = :id` — el permiso requerido depende de `files.relatedType`:
 *   talent    → talentos:read
 *   campaign  → campanas:read
 *   brand     → campanas:read  (brands se autoriza en el resto del código con `campanas`)
 *   invoice   → facturacion:read
 *   followup  → tareas:read
 *   task      → tareas:read
 *
 * Cualquier valor no reconocido → 404 (fail-closed).
 *
 * El token de Blob nunca se expone al cliente — se usa server-side para descargar
 * el archivo y se re-streamea con `Cache-Control: private, no-store` +
 * `X-Content-Type-Options: nosniff`.
 */
export const dynamic = 'force-dynamic';

const RELATED_TYPE_TO_MODULE: Record<string, Module> = {
  talent: 'talentos',
  campaign: 'campanas',
  brand: 'campanas',
  invoice: 'facturacion',
  followup: 'tareas',
  task: 'tareas',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const [row] = await db
    .select({
      url:         files.url,
      name:        files.name,
      mime:        files.mime,
      relatedType: files.relatedType,
    })
    .from(files)
    .where(eq(files.id, id))
    .limit(1);

  if (!row) {
    return new NextResponse('Not found', { status: 404 });
  }

  const permissionModule = RELATED_TYPE_TO_MODULE[row.relatedType];
  if (!permissionModule) {
    return new NextResponse('Not found', { status: 404 });
  }

  await requirePermission(permissionModule, 'read');

  return streamPrivateBlob({
    fileUrl: row.url,
    filename: row.name,
    ...(row.mime ? { fallbackContentType: row.mime } : {}),
  });
}
