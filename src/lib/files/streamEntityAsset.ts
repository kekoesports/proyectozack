import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { openFile } from '@/lib/storage';
import {
  getLatestEntityAsset,
  type EntityAssetKind,
} from '@/lib/queries/entityAssets';

const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';

type StreamEntityAssetInput = {
  readonly kind: EntityAssetKind;
  readonly entityId: number;
  readonly legacyPrefix: string;
  readonly emptyMessage: string;
  readonly defaultContentType: string;
};

/**
 * Sirve un activo mediante su índice portable.
 *
 * El fallback por `list()` solo existe durante la convivencia: evita romper la
 * web entre el despliegue de la tabla y el backfill del inventario. Cada uso se
 * registra para que el corte no pueda darse por terminado mientras quede alguno.
 */
export async function streamEntityAsset(input: StreamEntityAssetInput): Promise<NextResponse> {
  const indexed = await getLatestEntityAsset(input.kind, input.entityId);
  if (indexed) {
    try {
      const { stream, from } = await openFile(indexed.storageKey);
      if (from === 'fallback') {
        console.warn(`[entity-assets] leído del respaldo: ${input.kind}:${input.entityId}`);
      }
      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': indexed.contentType,
          'Cache-Control': CACHE_CONTROL,
        },
      });
    } catch (error) {
      console.error(
        `[entity-assets] índice no legible: ${input.kind}:${input.entityId}`,
        error instanceof Error ? error.name : 'error',
      );
      return new NextResponse(input.emptyMessage, { status: 404 });
    }
  }

  const token = env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse(input.emptyMessage, { status: 404 });

  console.warn(`[entity-assets] sin índice; usando listado heredado: ${input.kind}:${input.entityId}`);
  const { blobs } = await list({ prefix: input.legacyPrefix, token });
  const latest = [...blobs].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )[0];
  if (!latest) return new NextResponse(input.emptyMessage, { status: 404 });

  const response = await fetch(latest.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok || !response.body) {
    return new NextResponse(input.emptyMessage, { status: response.status || 502 });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? input.defaultContentType,
      'Cache-Control': CACHE_CONTROL,
    },
  });
}
