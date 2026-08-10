import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { requirePermission, needsVisibilityFilter, type Module } from '@/lib/permissions';
import { db } from '@/lib/db';
import { files } from '@/db/schema/files';
import { streamPrivateBlob } from '@/lib/files/streamPrivateBlob';
import type { Role } from '@/lib/auth-guard';

/**
 * Proxy admin para archivos polimórficos en Vercel Blob privado.
 *
 * Module gate by relatedType, then entity ownership for staff.
 * Fail-closed on unknown relatedType or ownership miss.
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

async function assertEntityAccess(
  relatedType: string,
  relatedId: number,
  session: { userId: string; role: Role },
): Promise<boolean> {
  if (!needsVisibilityFilter(session.role)) return true;

  try {
    switch (relatedType) {
      case 'campaign': {
        const { assertCanEditCampaign } = await import('@/lib/queries/campaigns');
        await assertCanEditCampaign(relatedId, session);
        return true;
      }
      case 'talent': {
        const { assertCanAccessTalent } = await import('@/lib/queries/talents');
        await assertCanAccessTalent(relatedId, session);
        return true;
      }
      case 'brand': {
        const { getCrmBrandForPermission } = await import('@/lib/queries/crmBrands');
        const brand = await getCrmBrandForPermission(relatedId);
        if (!brand) return false;
        return (
          brand.assignedToUserId === session.userId ||
          brand.coAssignedToUserId === session.userId ||
          brand.createdByUserId === session.userId
        );
      }
      case 'task': {
        const { getTaskById } = await import('@/lib/queries/crmTasks');
        const task = await getTaskById(relatedId);
        if (!task) return false;
        return task.ownerId === session.userId || task.assignedToUserId === session.userId;
      }
      case 'followup': {
        const { getBrandFollowupById } = await import('@/lib/queries/crmBrands');
        const fu = await getBrandFollowupById(relatedId);
        if (!fu) return false;
        const { getCrmBrandForPermission } = await import('@/lib/queries/crmBrands');
        const brand = await getCrmBrandForPermission(fu.brandId);
        if (!brand) return false;
        return (
          brand.assignedToUserId === session.userId ||
          brand.coAssignedToUserId === session.userId ||
          brand.createdByUserId === session.userId ||
          fu.assignedToUserId === session.userId
        );
      }
      case 'invoice':
        // Staff never has facturacion:read — module gate already blocks.
        // If role map changes, only creator may download.
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

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
      relatedId:   files.relatedId,
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

  const session = await requirePermission(permissionModule, 'read');

  const ok = await assertEntityAccess(row.relatedType, row.relatedId, {
    userId: session.user.id,
    role: session.user.role,
  });
  if (!ok) {
    return new NextResponse('Not found', { status: 404 });
  }

  return streamPrivateBlob({
    fileUrl: row.url,
    filename: row.name,
    ...(row.mime ? { fallbackContentType: row.mime } : {}),
  });
}
