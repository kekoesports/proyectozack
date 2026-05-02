'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { validateUploadedFile } from '@/lib/files/validateUploadedFile';
import { INVOICE_DOC_TYPES } from '@/lib/files/allowed-types';
import { uploadReasonMessage } from '@/lib/files/reason-messages';
import { createInvoiceSchema, updateInvoiceSchema } from '@/lib/schemas/invoice';
import { createInvoice, updateInvoice, deleteInvoice, getInvoice } from '@/lib/queries/invoices';
import { createFile } from '@/lib/queries/files';
import { compact, nullify } from '@/lib/utils/objects';

import type { FileRecord, NewInvoice } from '@/types';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly id?: number;
};

type AllowedMime = (typeof INVOICE_DOC_TYPES.mimes)[number];

const MADRID_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

async function uploadAttachment(
  file: File,
  kind: 'income' | 'expense',
  slot: 'invoice' | 'statement',
): Promise<{ readonly url: string; readonly path: string }> {
  const year = new Date().getFullYear();
  // Strip leading dots (defense vs `.htaccess` style names) + restrict charset.
  const safeName = file.name.replace(/^\.+/, '_').replace(/[^\w.\-]/g, '_').slice(0, 80);
  // Cryptographically random component — invoices/statements are PII; the path
  // must NOT be enumerable from outside. Vercel Blob URLs are public, so the
  // unguessability of the path is the primary access control here.
  const random = randomBytes(16).toString('hex');
  const path = `invoices/${kind}/${slot}/${year}/${random}-${safeName}`;
  // `validateUploadedFile` already verified `file.type` against magic bytes.
  const blob = await put(path, file, { access: 'public', contentType: file.type });
  return { url: blob.url, path };
}

async function processFileSlot(
  formData: FormData,
  field: 'invoiceFile' | 'statementFile',
  slot: 'invoice' | 'statement',
  kind: 'income' | 'expense',
  invoiceId: number,
  uploadedByUserId: string | null,
): Promise<{ readonly fileId: number } | { readonly error: string } | null> {
  const candidate = formData.get(field);
  if (!(candidate instanceof File) || candidate.size === 0) return null;

  const validation = await validateUploadedFile(candidate, {
    maxBytes: INVOICE_DOC_TYPES.maxBytes,
    allowedMimes: INVOICE_DOC_TYPES.mimes,
    allowedExts: INVOICE_DOC_TYPES.exts,
  });
  if (!validation.ok) return { error: uploadReasonMessage(validation.reason) };

  const attachment = await uploadAttachment(candidate, kind, slot);
  const fileType = slot === 'invoice' ? 'invoice' : 'statement';

  const fileRow: FileRecord = await createFile({
    name: candidate.name.slice(0, 250),
    type: fileType,
    mime: candidate.type as AllowedMime,
    sizeBytes: candidate.size,
    url: attachment.url,
    path: attachment.path,
    relatedType: 'invoice',
    relatedId: invoiceId,
    ...(uploadedByUserId ? { uploadedByUserId } : {}),
  });
  return { fileId: fileRow.id };
}

export async function createInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, createInvoiceSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[invoices] createInvoiceAction validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  let createdId: number;
  try {
    const baseValues = nullify({
      ...parsed.data,
      currency: 'EUR',
      createdByUserId: session.user.id,
    }) as NewInvoice;
    const row = await createInvoice(baseValues);
    createdId = row.id;
  } catch (err) {
    logRedacted('error', '[invoices] createInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear el movimiento' };
  }

  // Sequential uploads: short-circuit on first failure to avoid an orphan
  // blob/file row when the second slot would also fail. Failure rolls back
  // the just-created invoice row.
  try {
    const invoiceFileResult = await processFileSlot(
      formData, 'invoiceFile', 'invoice', parsed.data.kind, createdId, session.user.id,
    );
    if (invoiceFileResult && 'error' in invoiceFileResult) {
      await deleteInvoice(createdId).catch((e: unknown) => {
        logRedacted('error', '[invoices] rollback failed:', e instanceof Error ? e.message : 'unknown');
      });
      return { error: invoiceFileResult.error };
    }

    const statementFileResult = await processFileSlot(
      formData, 'statementFile', 'statement', parsed.data.kind, createdId, session.user.id,
    );
    if (statementFileResult && 'error' in statementFileResult) {
      await deleteInvoice(createdId).catch((e: unknown) => {
        logRedacted('error', '[invoices] rollback failed:', e instanceof Error ? e.message : 'unknown');
      });
      return { error: statementFileResult.error };
    }

    const patch: Partial<NewInvoice> = {};
    if (invoiceFileResult && 'fileId' in invoiceFileResult) patch.invoiceFileId = invoiceFileResult.fileId;
    if (statementFileResult && 'fileId' in statementFileResult) patch.statementFileId = statementFileResult.fileId;
    if (Object.keys(patch).length > 0) {
      await updateInvoice(createdId, patch);
    }
  } catch (err) {
    logRedacted('error', '[invoices] upload error:', err instanceof Error ? err.message : 'unknown');
    await deleteInvoice(createdId).catch((e: unknown) => {
      logRedacted('error', '[invoices] rollback failed:', e instanceof Error ? e.message : 'unknown');
    });
    return { error: 'Error al subir el archivo' };
  }

  revalidatePath('/admin/facturacion');
  return { success: true, id: createdId };
}

export async function updateInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, updateInvoiceSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[invoices] updateInvoiceAction validation failed:', firstError(parsed.fieldErrors));
    return { error: firstError(parsed.fieldErrors) };
  }

  const { id, ...rest } = parsed.data;
  const existing = await getInvoice(id);

  try {
    if (!existing) return { error: 'Factura no encontrada' };

    const patch = compact({ ...rest, currency: 'EUR' }) as Partial<NewInvoice>;
    await updateInvoice(id, patch);

    const kind: 'income' | 'expense' = rest.kind ?? existing.kind;

    const invoiceFileResult = await processFileSlot(
      formData, 'invoiceFile', 'invoice', kind, id, session.user.id,
    );
    if (invoiceFileResult && 'error' in invoiceFileResult) return { error: invoiceFileResult.error };

    const statementFileResult = await processFileSlot(
      formData, 'statementFile', 'statement', kind, id, session.user.id,
    );
    if (statementFileResult && 'error' in statementFileResult) return { error: statementFileResult.error };

    const filePatch: Partial<NewInvoice> = {};
    if (invoiceFileResult && 'fileId' in invoiceFileResult) filePatch.invoiceFileId = invoiceFileResult.fileId;
    if (statementFileResult && 'fileId' in statementFileResult) filePatch.statementFileId = statementFileResult.fileId;
    if (Object.keys(filePatch).length > 0) {
      await updateInvoice(id, filePatch);
    }
  } catch (err) {
    logRedacted('error', '[invoices] updateInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar el movimiento' };
  }

  revalidatePath('/admin/facturacion');
  return { success: true, id };
}

export async function deleteInvoiceAction(id: number): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    assertCanDelete(session.user.role);
  } catch {
    return { error: 'Sin permiso para eliminar' };
  }
  try {
    const existing = await getInvoice(id);
    if (existing?.filePath) {
      try { await del(existing.filePath); } catch { /* ignore */ }
    }
    if (existing?.receiptFilePath) {
      try { await del(existing.receiptFilePath); } catch { /* ignore */ }
    }
    await deleteInvoice(id);
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[invoices] deleteInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar el movimiento' };
  }
}

export async function annulInvoiceAction(id: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    const existing = await getInvoice(id);
    await updateInvoice(id, { status: 'anulada' });
    revalidatePath('/admin/facturacion');
    if (existing?.campaignId) {
      revalidatePath(`/admin/campanas/${existing.campaignId}`);
    }
    return { success: true };
  } catch (err) {
    logRedacted('error', '[invoices] annulInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al anular la factura' };
  }
}

export async function bulkDeleteInvoicesAction(ids: number[]): Promise<ActionState> {
  await requireAnyRole(['admin'], '/admin/login');
  if (ids.length === 0) return {};
  try {
    for (const id of ids) {
      const existing = await getInvoice(id);
      if (existing?.filePath)        try { await del(existing.filePath);        } catch { /* ignore */ }
      if (existing?.receiptFilePath) try { await del(existing.receiptFilePath); } catch { /* ignore */ }
      await deleteInvoice(id);
    }
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[invoices] bulkDeleteInvoices error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar movimientos' };
  }
}

export async function markInvoicePaidAction(id: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const today = MADRID_DATE_FMT.format(new Date());
  try {
    const existing = await getInvoice(id);
    // income → cobrada; expense → pagada — ambos estados conviven en el set
    // de `INVOICE_STATUSES` por diseño (settled income vs settled expense).
    const newStatus = existing?.kind === 'expense' ? 'pagada' : 'cobrada';
    await updateInvoice(id, { status: newStatus, paidDate: today });
    revalidatePath('/admin/facturacion');
    if (existing?.campaignId) {
      revalidatePath(`/admin/campanas/${existing.campaignId}`);
    }
    return { success: true };
  } catch (err) {
    logRedacted('error', '[invoices] markPaid error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al marcar como cobrado/pagado' };
  }
}
