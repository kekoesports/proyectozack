import { randomUUID } from 'node:crypto';
import { requireCreator } from '@/lib/studio/access';
import { StudioAssetInput, StudioOrigin, StudioTalentId } from '@/lib/schemas/studio';
import { uploadFile, deleteFile } from '@/lib/storage';
import { detectStudioMedia, MAX_STUDIO_UPLOAD } from '@/lib/studio/media';
import { SITE_URL } from '@/lib/site-url';
import { isStudioUploadOrigin } from '@/lib/studio/origins';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const { repository, member } = await requireCreator();
  const origin = StudioOrigin.safeParse(request.headers.get('origin'));
  if (
    !origin.success ||
    // Next standalone uses its internal host/port for request.url behind Caddy.
    // Trust only our explicit public origins, never client-supplied forwarded hosts.
    !isStudioUploadOrigin(origin.data, SITE_URL)
  )
    return new Response('Forbidden', { status: 403 });
  // Bound actual bytes while streaming; Content-Length alone is untrusted.
  const reader = request.body?.getReader();
  if (!reader) return new Response('Archivo requerido', { status: 400 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_STUDIO_UPLOAD + 16384) {
      await reader.cancel();
      return new Response('Máximo 20 MB', { status: 413 });
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    }).formData();
  } catch {
    return new Response('Formulario inválido', { status: 400 });
  }
  const file = form.get('file');
  const workspace = StudioTalentId.safeParse(form.get('workspace'));
  if (!workspace.success || workspace.data !== member.talentId)
    return new Response('El espacio cambió. Actualiza antes de subir.', { status: 409 });
  const parsed = StudioAssetInput.safeParse({
    name: form.get('name'),
    projectId: form.get('projectId') || null,
    rightsConfirmed: form.get('rightsConfirmed') === 'true',
  });
  if (
    !parsed.success ||
    !(file instanceof File) ||
    !file.size ||
    file.size > MAX_STUDIO_UPLOAD
  )
    return new Response('Revisa archivo, proyecto y derechos de uso.', {
      status: 400,
    });
  if (
    parsed.data.projectId &&
    !(await repository.project(parsed.data.projectId))
  )
    return new Response('No encontrado', { status: 404 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const media = detectStudioMedia(buffer);
  if (!media)
    return new Response(
      'Formato no admitido: usa JPG, PNG, WebP, MP4, MP3, WAV u OGG.',
      { status: 415 },
    );
  let uploaded: Awaited<ReturnType<typeof uploadFile>> | undefined;
  try {
    uploaded = await uploadFile({
      filename: `${randomUUID()}.${media.extension}`,
      data: buffer,
      contentType: media.contentType,
      visibility: 'private',
      prefix: 'studio',
    });
    const asset = await repository.addAsset({
      ...parsed.data,
      storageKey: uploaded.storageKey,
      checksum: uploaded.checksum,
      contentType: media.contentType,
      size: uploaded.size,
    });
    if (!asset) {
      await deleteFile(uploaded.storageKey);
      return new Response('Acceso no disponible', { status: 403 });
    }
    return Response.json(
      { ok: true, id: asset.id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Compensate only this newly uploaded object, never existing creator assets.
    if (uploaded) await deleteFile(uploaded.storageKey).catch(() => undefined);
    return new Response('No se pudo guardar el recurso.', { status: 500 });
  }
}
