import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requirePermission, needsVisibilityFilter } from '@/lib/permissions';
import { getBrief } from '@/lib/queries/brandBriefs';
import { getCrmBrandForPermission } from '@/lib/queries/crmBrands';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';

/**
 * Proxy admin for brand brief source files (private Vercel Blob).
 * Requires campanas:read + brand ownership for staff.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requirePermission('campanas', 'read');

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const brief = await getBrief(id);
  if (!brief?.sourceFileUrl) {
    return new NextResponse('PDF no disponible', { status: 404 });
  }

  if (needsVisibilityFilter(session.user.role)) {
    const brand = await getCrmBrandForPermission(brief.brandId);
    if (!brand) return new NextResponse('Not found', { status: 404 });
    const isOwner =
      brand.assignedToUserId === session.user.id ||
      brand.coAssignedToUserId === session.user.id ||
      brand.createdByUserId === session.user.id;
    if (!isOwner) return new NextResponse('Not found', { status: 404 });
  }

  return streamPrivateBlob({
    fileUrl: brief.sourceFileUrl,
    filename: brief.sourceFileName ?? 'brief.pdf',
    ...(brief.sourceFileMime ? { fallbackContentType: brief.sourceFileMime } : {}),
  });
}
