'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { requirePermission, needsVisibilityFilter } from '@/lib/permissions';
import { createBrief, updateBrief, deleteBrief, getBrief } from '@/lib/queries/brandBriefs';
import { getCrmBrandForPermission } from '@/lib/queries/crmBrands';

import type { Role } from '@/lib/auth-guard';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

async function assertCanEditBrand(
  brandId: number,
  session: { userId: string; role: Role },
): Promise<void> {
  if (!needsVisibilityFilter(session.role)) return;
  const brand = await getCrmBrandForPermission(brandId);
  if (!brand) throw new Error('forbidden:edit:brand');
  const isOwner =
    brand.assignedToUserId === session.userId ||
    brand.coAssignedToUserId === session.userId ||
    brand.createdByUserId === session.userId;
  if (!isOwner) throw new Error('forbidden:edit:brand');
}

async function assertBriefBelongsToBrand(briefId: number, brandId: number): Promise<boolean> {
  const brief = await getBrief(briefId);
  return brief !== null && brief !== undefined && brief.brandId === brandId;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp',
  'text/plain',
];

export async function uploadBriefAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'write');

  const brandIdRaw = formData.get('brandId');
  const brandId    = brandIdRaw ? Number(brandIdRaw) : NaN;
  if (Number.isNaN(brandId)) return { error: 'ID de marca inválido' };

  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }

  const name    = (formData.get('name')    as string | null)?.trim();
  const version = (formData.get('version') as string | null)?.trim() || 'v1';
  const geo     = (formData.get('geo')     as string | null)?.trim() || null;
  const notes   = (formData.get('notes')   as string | null)?.trim() || null;
  const file    = formData.get('file');

  if (!name) return { error: 'El nombre es obligatorio' };

  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecciona un archivo' };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { error: 'Formato no permitido. Usa PDF, DOC, DOCX, imagen o texto.' };
  }
  if (file.size > MAX_BYTES) {
    return { error: 'El archivo supera el límite de 20 MB' };
  }

  try {
    const safeName = file.name.replace(/[^\w.\-]/g, '_');
    const path     = `briefs/${brandId}/${Date.now()}-${safeName}`;
    const blob     = await put(path, file, { access: 'private', contentType: file.type });

    const row = await createBrief({
      brandId,
      name,
      version,
      geo,
      status:          'pending_review',
      sourceFileUrl:   blob.url,
      sourceFilePath:  path,
      sourceFileName:  file.name,
      sourceFileMime:  file.type,
      extractedData:   null,
      rawText:         null,
      notes,
      createdByUserId:  session.user.id,
      reviewedByUserId: null,
      reviewedAt:       null,
    });

    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true, id: row.id };
  } catch (err) {
    console.error('[admin] uploadBrief error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al subir el archivo' };
  }
}

export async function updateBriefNotesAction(
  briefId: number,
  brandId: number,
  notes: string,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'write');
  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }
  if (!(await assertBriefBelongsToBrand(briefId, brandId))) {
    return { error: 'Brief no encontrado en esta marca' };
  }
  try {
    await updateBrief(briefId, { notes: notes.trim() || null });
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    console.error('[admin] updateBriefNotes error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al guardar las notas' };
  }
}

export async function approveBriefAction(
  briefId: number,
  brandId: number,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'delete');
  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }
  if (!(await assertBriefBelongsToBrand(briefId, brandId))) {
    return { error: 'Brief no encontrado en esta marca' };
  }
  try {
    await updateBrief(briefId, {
      status:          'approved',
      reviewedByUserId: session.user.id,
      reviewedAt:       new Date(),
    });
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    console.error('[admin] approveBrief error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al aprobar el brief' };
  }
}

export async function archiveBriefAction(
  briefId: number,
  brandId: number,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'write');
  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }
  if (!(await assertBriefBelongsToBrand(briefId, brandId))) {
    return { error: 'Brief no encontrado en esta marca' };
  }
  try {
    await updateBrief(briefId, { status: 'archived' });
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    console.error('[admin] archiveBrief error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al archivar' };
  }
}

export async function deleteBriefAction(
  briefId: number,
  brandId: number,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'delete');
  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }
  if (!(await assertBriefBelongsToBrand(briefId, brandId))) {
    return { error: 'Brief no encontrado en esta marca' };
  }
  try {
    const brief = await getBrief(briefId);
    if (brief?.sourceFilePath) {
      try { await del(brief.sourceFilePath); } catch { /* ignore blob errors */ }
    }
    await deleteBrief(briefId);
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    console.error('[admin] deleteBrief error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar el brief' };
  }
}

import type { BriefContent } from '@/db/schema/brandBriefs';

export async function updateBriefContentAction(
  briefId:  number,
  brandId:  number,
  content:  BriefContent,
  meta:     { name?: string; version?: string; geo?: string },
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'write');
  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }
  if (!(await assertBriefBelongsToBrand(briefId, brandId))) {
    return { error: 'Brief no encontrado en esta marca' };
  }
  try {
    await updateBrief(briefId, {
      briefContent: content,
      ...(meta.name    ? { name:    meta.name    } : {}),
      ...(meta.version ? { version: meta.version } : {}),
      ...(meta.geo     ? { geo:     meta.geo     } : {}),
    });
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    console.error('[admin] updateBriefContent error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al guardar el brief' };
  }
}

export async function createEmptyBriefAction(
  brandId: number,
  name:    string,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'write');
  try {
    await assertCanEditBrand(brandId, { userId: session.user.id, role: session.user.role });
  } catch {
    return { error: 'Sin permiso para modificar esta marca' };
  }
  try {
    const brief = await createBrief({
      brandId,
      name,
      version:         'v1',
      status:          'pending_review',
      briefContent:    {},
      geo:             null,
      notes:           null,
      sourceFileUrl:   null,
      sourceFilePath:  null,
      sourceFileName:  null,
      sourceFileMime:  null,
      extractedData:   null,
      rawText:         null,
      createdByUserId: session.user.id,
      reviewedByUserId: null,
      reviewedAt:      null,
    });
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true, id: brief.id };
  } catch (err) {
    console.error('[admin] createEmptyBrief error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear el brief' };
  }
}
