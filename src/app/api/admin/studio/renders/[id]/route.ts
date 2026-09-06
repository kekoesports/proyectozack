import { requireStudioAgency } from '@/lib/studio/access';
import { StudioId } from '@/lib/schemas/studio';
import { db } from '@/lib/db';
import { studioAgencyRenderAsset } from '@/lib/studio/render-review';
import { studioAssetResponse } from '@/lib/studio/asset-response';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireStudioAgency();
  const parsed = StudioId.safeParse((await context.params).id);
  if (!parsed.success) return new Response('No encontrado', { status: 404 });
  const asset = await studioAgencyRenderAsset(db, parsed.data);
  if (!asset) return new Response('No encontrado', { status: 404 });
  return studioAssetResponse(request, asset);
}
