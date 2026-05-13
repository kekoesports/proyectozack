'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import {
  getContractByCampaign, createContract, updateContract,
} from '@/lib/queries/contracts';
import { parseFormData } from '@/lib/forms/parseFormData';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { CONTRACT_PDF_TYPES } from '@/lib/files/allowed-types';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly contractId?: number };

const GenerateContractMeta = z.object({
  campaignId: IdSchema,
  templateId: IdSchema,
  fileName: z.string().trim().min(1).max(200).default('contrato.pdf'),
});

export async function saveGeneratedContractAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePermission('campanas', 'read');

  const meta = parseFormData(formData, GenerateContractMeta);
  if (!meta.ok) return { error: 'Parámetros inválidos' };
  const { campaignId, templateId, fileName } = meta.data;

  const pdfFile = formData.get('pdf');
  if (!(pdfFile instanceof File)) return { error: 'PDF no recibido' };

  const validation = await validateUploadedFile(pdfFile, {
    maxBytes: CONTRACT_PDF_TYPES.maxBytes,
    allowedMimes: CONTRACT_PDF_TYPES.mimes,
    allowedExts: CONTRACT_PDF_TYPES.exts,
  });
  if (!validation.ok) {
    if (validation.reason === 'too_large') return { error: 'PDF demasiado grande' };
    if (validation.reason === 'empty_file') return { error: 'PDF no recibido' };
    return { error: 'PDF inválido' };
  }

  try {
    const path = `contracts/generated/${campaignId}/${Date.now()}-${fileName.replace(/[^\w.\-]/g, '_')}`;
    const blob = await put(path, pdfFile, { access: 'private', contentType: 'application/pdf' });

    const existing = await getContractByCampaign(campaignId);

    if (existing) {
      await updateContract(existing.id, {
        fileUrl: blob.url, filePath: path, fileName,
        status: 'draft',
      });
      revalidatePath(`/admin/campanas/${campaignId}`);
      return { success: true, contractId: existing.id };
    }

    const row = await createContract({
      campaignId,
      fileUrl: blob.url, filePath: path, fileName,
      signedFileUrl: null, status: 'draft',
      sentAt: null, signedAt: null, notes: `Generado desde plantilla ${templateId}`,
      createdByUserId: session.user.id,
    });
    revalidatePath(`/admin/campanas/${campaignId}`);
    return { success: true, contractId: row.id };
  } catch (err) {
    logRedacted('error', '[admin] saveGeneratedContract error:', err);
    return { error: 'Error al guardar el contrato generado' };
  }
}
