'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  getContractByCampaign, createContract, updateContract,
} from '@/lib/queries/contracts';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly contractId?: number };

export async function saveGeneratedContractAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session    = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const campaignId = Number(formData.get('campaignId'));
  const templateId = Number(formData.get('templateId'));
  const pdfFile    = formData.get('pdf');
  const fileName   = (formData.get('fileName') as string | null) ?? 'contrato.pdf';

  if (isNaN(campaignId) || isNaN(templateId)) return { error: 'Parámetros inválidos' };
  if (!(pdfFile instanceof File) || pdfFile.size === 0) return { error: 'PDF no recibido' };

  try {
    const path = `contracts/generated/${campaignId}/${Date.now()}-${fileName.replace(/[^\w.\-]/g, '_')}`;
    const blob = await put(path, pdfFile, { access: 'public', contentType: 'application/pdf' });

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
    console.error('[admin] saveGeneratedContract error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al guardar el contrato generado' };
  }
}
