'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import {
  createGeneratedContract,
  updateGeneratedContract,
  deleteGeneratedContract,
  getGeneratedContract,
} from '@/lib/queries/generatedContracts';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { CONTRACT_PDF_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly contractId?: number };

// ── Crear contrato generado ───────────────────────────────────────────

const SaveContractMeta = z.object({
  title:      z.string().trim().min(1, 'El título es obligatorio').max(200),
  content:    z.string().trim().min(1).max(500_000),
  varsJson:   z.string().optional(),
  templateId: z.coerce.number().int().positive().optional(),
  talentId:   z.coerce.number().int().positive().optional(),
  brandId:    z.coerce.number().int().positive().optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  notes:      z.string().max(2000).optional(),
  fileName:   z.string().trim().min(1).max(300).default('contrato.pdf'),
});

export async function saveGeneratedContractAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission('contratos', 'write');

  const meta = parseFormData(formData, SaveContractMeta);
  if (!meta.ok) return { error: firstError(meta.fieldErrors) };
  const { title, content, varsJson, templateId, talentId, brandId, campaignId, notes, fileName } = meta.data;

  const pdfFile = formData.get('pdf');
  if (!(pdfFile instanceof File)) return { error: 'PDF no recibido' };

  const validation = await validateUploadedFile(pdfFile, {
    maxBytes: CONTRACT_PDF_TYPES.maxBytes,
    allowedMimes: CONTRACT_PDF_TYPES.mimes,
    allowedExts: CONTRACT_PDF_TYPES.exts,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large')  return { error: 'PDF demasiado grande (máx. 10 MB)' };
    if (validation.reason === 'empty_file') return { error: 'PDF vacío' };
    return { error: 'Archivo no válido (solo se aceptan PDFs)' };
  }

  try {
    const safeName = fileName.replace(/[^\w.\-]/g, '_');
    const path     = `contracts/standalone/${session.user.id}/${Date.now()}-${safeName}`;
    const blob     = await put(path, pdfFile, { access: 'private', contentType: 'application/pdf' });

    const row = await createGeneratedContract({
      title,
      content,
      varsJson:        varsJson ?? null,
      templateId:      templateId  ?? null,
      talentId:        talentId    ?? null,
      brandId:         brandId     ?? null,
      campaignId:      campaignId  ?? null,
      status:          'draft',
      fileUrl:         blob.url,
      filePath:        path,
      fileName:        safeName,
      notes:           notes ?? null,
      sentAt:          null,
      signedAt:        null,
      createdByUserId: session.user.id,
    });

    revalidatePath('/admin/contratos');
    return { success: true, contractId: row.id };
  } catch (err) {
    logRedacted('error', '[admin] saveGeneratedContract error:', err);
    return { error: 'Error al guardar el contrato' };
  }
}

// ── Actualizar estado ─────────────────────────────────────────────────

const UpdateStatusMeta = z.object({
  id:     IdSchema,
  status: z.enum(['draft', 'sent', 'signed', 'archived']),
  notes:  z.string().max(2000).optional(),
});

export async function updateContractStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('contratos', 'write');

  const parsed = parseFormData(formData, UpdateStatusMeta);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };
  const { id, status, notes } = parsed.data;

  try {
    const now   = new Date();
    const patch: Parameters<typeof updateGeneratedContract>[1] = { status };
    // Only overwrite notes when the field is explicitly submitted
    if (notes !== undefined) patch.notes = notes;
    if (status === 'sent')   patch.sentAt   = now;
    if (status === 'signed') patch.signedAt = now;
    await updateGeneratedContract(id, patch);
    revalidatePath('/admin/contratos');
    revalidatePath(`/admin/contratos/${id}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] updateContractStatus error:', err);
    return { error: 'Error al actualizar el contrato' };
  }
}

// ── Eliminar contrato ─────────────────────────────────────────────────

export async function deleteContractAction(id: number): Promise<ActionState> {
  await requirePermission('contratos', 'delete');

  try {
    const contract = await getGeneratedContract(id);
    if (!contract) return { error: 'Contrato no encontrado' };

    if (contract.filePath) {
      try { await del(contract.filePath); } catch { /* Blob already deleted or missing */ }
    }

    await deleteGeneratedContract(id);
    revalidatePath('/admin/contratos');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] deleteContract error:', err);
    return { error: 'Error al eliminar el contrato' };
  }
}
