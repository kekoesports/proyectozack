import { requireCreator } from '@/lib/studio/access';
import { StudioId, StudioDownloadQuery } from '@/lib/schemas/studio';
import { getStorage } from '@/lib/storage';
import { parseStudioRange, studioRangeStream } from '@/lib/studio/byte-range';

export const runtime = 'nodejs';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { repository } = await requireCreator();
  const parsed = StudioId.safeParse((await context.params).id);
  if (!parsed.success) return new Response('No encontrado', { status: 404 });
  const asset = await repository.asset(parsed.data);
  if (!asset) return new Response('No encontrado', { status: 404 });
  const rangeHeader = request.headers.get('range');
  const range = rangeHeader ? parseStudioRange(rangeHeader, asset.size) : null;
  if (rangeHeader && !range)
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${asset.size}`,
        'Cache-Control': 'private, no-store',
      },
    });
  const query = StudioDownloadQuery.safeParse({
    download: new URL(request.url).searchParams.get('download') ?? undefined,
  });
  const download = query.success && query.data.download === '1';
  try {
    const stream = await getStorage().openReadStream(asset.storageKey);
    return new Response(range ? studioRangeStream(stream, range) : stream, {
      status: range ? 206 : 200,
      headers: {
        'Content-Type': asset.contentType,
        'Content-Length': String(
          range ? range.end - range.start + 1 : asset.size,
        ),
        'Accept-Ranges': 'bytes',
        ...(range
          ? {
              'Content-Range': `bytes ${range.start}-${range.end}/${asset.size}`,
            }
          : {}),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="studio-asset.${asset.contentType.split('/')[1]}"; filename*=UTF-8''${encodeURIComponent(asset.name).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16)}`)}`,
      },
    });
  } catch {
    return new Response('Recurso no disponible', { status: 404 });
  }
}
