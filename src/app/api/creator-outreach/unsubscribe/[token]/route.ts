import { NextResponse } from 'next/server';
import { z } from 'zod';

import { unsubscribeCreatorOutreach } from '@/lib/queries/creatorOutreach';

export const runtime = 'nodejs';

const tokenSchema = z.uuid();

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly token: string }> },
): Promise<NextResponse> {
  const parsed = tokenSchema.safeParse((await context.params).token);
  if (!parsed.success) return html('Enlace no válido', 400);
  return html(`<form method="post"><p>¿Quieres dejar de recibir mensajes de colaboración de SocialPro?</p><button type="submit">Dar de baja</button></form>`);
}

export async function POST(
  _request: Request,
  context: { readonly params: Promise<{ readonly token: string }> },
): Promise<NextResponse> {
  const parsed = tokenSchema.safeParse((await context.params).token);
  if (!parsed.success) return html('Enlace no válido', 400);
  const updated = await unsubscribeCreatorOutreach(parsed.data);
  return html(updated ? 'Baja registrada. No recibirás más mensajes de colaboración.' : 'Este enlace ya no está disponible.', updated ? 200 : 404);
}

function html(content: string, status = 200): NextResponse {
  return new NextResponse(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Preferencias de contacto</title><body style="font-family:Arial,sans-serif;max-width:620px;margin:60px auto;padding:24px;color:#171717">${content}</body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
