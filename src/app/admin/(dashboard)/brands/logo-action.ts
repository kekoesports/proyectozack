'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { z } from 'zod';

import { db } from '@/lib/db';
import { crmBrands } from '@/db/schema';
import { requirePermission, needsVisibilityFilter } from '@/lib/permissions';
import { getCrmBrandForPermission } from '@/lib/queries/crmBrands';
import type { Role } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { PHOTO_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

const LogoMeta = z.object({ id: IdSchema });

async function assertCanEditBrand(
  brandId: number,
  session: { userId: string; role: Role },
): Promise<void> {
  if (!needsVisibilityFilter(session.role)) return;
  const brand = await getCrmBrandForPermission(brandId);
  if (!brand) throw new Error('forbidden:edit:brand');
  const isOwner =
    brand.assignedToUserId   === session.userId ||
    brand.coAssignedToUserId === session.userId ||
    brand.createdByUserId    === session.userId;
  if (!isOwner) throw new Error('forbidden:edit:brand');
}

export async function uploadBrandLogoAction(
  formData: FormData,
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  const session = await requirePermission('campanas', 'write');

  const meta = parseFormData(formData, LogoMeta);
  if (!meta.ok) return { success: false, error: 'ID inválido' };
  const { id } = meta.data;

  try {
    await assertCanEditBrand(id, { userId: session.user.id, role: session.user.role });
  } catch {
    return { success: false, error: 'Sin permiso para modificar esta marca' };
  }

  const fileEntry = formData.get('logo');
  if (!(fileEntry instanceof File)) return { success: false, error: 'Archivo requerido' };

  const validation = await validateUploadedFile(fileEntry, {
    maxBytes: PHOTO_TYPES.maxBytes,
    allowedMimes: PHOTO_TYPES.mimes,
    allowedExts: PHOTO_TYPES.exts,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large') return { success: false, error: 'La imagen no puede superar 5 MB' };
    if (validation.reason === 'empty_file') return { success: false, error: 'Archivo vacío' };
    return { success: false, error: 'Formato no permitido (jpg/png/webp/gif)' };
  }

  try {
    const lastDot = fileEntry.name.lastIndexOf('.');
    const ext = lastDot >= 0 ? fileEntry.name.slice(lastDot + 1).toLowerCase() : 'png';
    // Store is private-only — proxy /api/brand-logo/[id] serves it publicly.
    const blob = await put(`brands/${id}-${Date.now()}.${ext}`, fileEntry, {
      access: 'private',
      contentType: fileEntry.type,
    });
    void blob;

    const proxyLogoUrl = `/api/brand-logo/${id}`;
    await db.update(crmBrands).set({ logoUrl: proxyLogoUrl, updatedAt: new Date() }).where(eq(crmBrands.id, id));

    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${id}`);

    return { success: true, logoUrl: proxyLogoUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRedacted('error', '[admin] uploadBrandLogo error:', msg);
    return { success: false, error: `Error al subir: ${msg.slice(0, 150)}` };
  }
}

export async function clearBrandLogoAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const session = await requirePermission('campanas', 'write');

  const meta = parseFormData(formData, LogoMeta);
  if (!meta.ok) return { success: false, error: 'ID inválido' };
  const { id } = meta.data;

  try {
    await assertCanEditBrand(id, { userId: session.user.id, role: session.user.role });
  } catch {
    return { success: false, error: 'Sin permiso para modificar esta marca' };
  }

  try {
    await db.update(crmBrands).set({ logoUrl: null, updatedAt: new Date() }).where(eq(crmBrands.id, id));
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${id}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] clearBrandLogo error:', err);
    return { success: false, error: 'Error al quitar el logo' };
  }
}
