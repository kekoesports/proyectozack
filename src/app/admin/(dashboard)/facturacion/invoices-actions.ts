'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { requireAnyRole, type Role } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
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

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;

type AllowedMime = (typeof ALLOWED_MIME)[number];

/**
 * Magic-byte sniff to verify a file matches its declared MIME.
 * Defends against attackers swapping `Content-Type` header with malicious content
 * (e.g., uploading HTML labelled as `image/png`). Server-derived MIME wins over
 * client-provided `file.type` for the actual `put()` call.
 */
function detectMime(head: Uint8Array): AllowedMime | null {
  if (head.length < 12) return null;
  // %PDF-
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return 'application/pdf';
  // PNG signature
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png';
  // JPEG SOI
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  // WEBP — RIFF....WEBP
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) return 'image/webp';
  return null;
}

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  return obj;
}

async function uploadAttachment(
  file: File,
  kind: 'income' | 'expense',
  slot: 'invoice' | 'statement',
  verifiedMime: AllowedMime,
): Promise<{ readonly url: string; readonly path: string }> {
  const year = new Date().getFullYear();
  // Strip leading dots (defense vs `.htaccess` style names) + restrict charset.
  const safeName = file.name.replace(/^\.+/, '_').replace(/[^\w.\-]/g, '_').slice(0, 80);
  // Cryptographically random component — invoices/statements are PII; the path
  // must NOT be enumerable from outside. Vercel Blob URLs are public, so the
  // unguessability of the path is the primary access control here.
  const random = randomBytes(16).toString('hex');
  const path = `invoices/${kind}/${slot}/${year}/${random}-${safeName}`;
  // Use server-verified MIME, NOT the attacker-controlled `file.type`.
  const blob = await put(path, file, { access: 'public', contentType: verifiedMime });
  return { url: blob.url, path };
}

async function validateUpload(file: File): Promise<{ ok: true; mime: AllowedMime } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: 'Archivo vacío' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'El archivo no puede superar 10 MB' };
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: 'Tipo de archivo no permitido (PDF, JPG, PNG, WebP)' };
  }
  // Sniff first 12 bytes — the actual content must match the declared type.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectMime(head);
  if (!detected) return { ok: false, error: 'Contenido no reconocido como PDF/JPG/PNG/WebP' };
  if (detected !== file.type) {
    return { ok: false, error: 'El contenido no coincide con el tipo declarado' };
  }
  return { ok: true, mime: detected };
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

  const validation = await validateUpload(candidate);
  if (!validation.ok) return { error: validation.error };

  const attachment = await uploadAttachment(candidate, kind, slot, validation.mime);
  const fileType = slot === 'invoice' ? 'invoice' : 'statement';

  const fileRow: FileRecord = await createFile({
    name: candidate.name.slice(0, 250),
    type: fileType,
    mime: validation.mime,
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

  const parsed = createInvoiceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  // Insert invoice first so we have an id to attach files to.
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
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] createInvoice error:', msg);
    return { error: 'Error al crear la factura' };
  }

  // Upload optional invoice file + statement file.
  // On any upload failure, roll back by deleting the invoice row so we never
  // leave a dangling invoice without its required file attachment.
  try {
    const invoiceFileResult = await processFileSlot(
      formData,
      'invoiceFile',
      'invoice',
      parsed.data.kind,
      createdId,
      session.user.id,
    );
    if (invoiceFileResult && 'error' in invoiceFileResult) {
      await deleteInvoice(createdId).catch((e: unknown) => {
        console.error('[admin] invoice rollback failed:', e instanceof Error ? e.message : 'unknown');
      });
      return { error: invoiceFileResult.error };
    }

    const statementFileResult = await processFileSlot(
      formData,
      'statementFile',
      'statement',
      parsed.data.kind,
      createdId,
      session.user.id,
    );
    if (statementFileResult && 'error' in statementFileResult) {
      await deleteInvoice(createdId).catch((e: unknown) => {
        console.error('[admin] invoice rollback failed:', e instanceof Error ? e.message : 'unknown');
      });
      return { error: statementFileResult.error };
    }

    const patch: Record<string, unknown> = {};
    if (invoiceFileResult && 'fileId' in invoiceFileResult) patch.invoiceFileId = invoiceFileResult.fileId;
    if (statementFileResult && 'fileId' in statementFileResult) patch.statementFileId = statementFileResult.fileId;
    if (Object.keys(patch).length > 0) {
      await updateInvoice(createdId, patch as Partial<NewInvoice>);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] invoice upload error:', msg);
    await deleteInvoice(createdId).catch((e: unknown) => {
      console.error('[admin] invoice rollback failed:', e instanceof Error ? e.message : 'unknown');
    });
    return { error: 'Error al subir el archivo' };
  }

  revalidatePath('/admin/facturacion');
  return { success: true, id: createdId };
}

export async function updateInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = updateInvoiceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, ...rest } = parsed.data;

  try {
    const existing = await getInvoice(id);
    if (!existing) return { error: 'Factura no encontrada' };

    const patch = compact({ ...rest, currency: 'EUR' });
    await updateInvoice(id, patch as Partial<NewInvoice>);

    const invoiceFileResult = await processFileSlot(
      formData,
      'invoiceFile',
      'invoice',
      (rest.kind ?? existing.kind) as 'income' | 'expense',
      id,
      session.user.id,
    );
    if (invoiceFileResult && 'error' in invoiceFileResult) return { error: invoiceFileResult.error };

    const statementFileResult = await processFileSlot(
      formData,
      'statementFile',
      'statement',
      (rest.kind ?? existing.kind) as 'income' | 'expense',
      id,
      session.user.id,
    );
    if (statementFileResult && 'error' in statementFileResult) return { error: statementFileResult.error };

    const filePatch: Record<string, unknown> = {};
    if (invoiceFileResult && 'fileId' in invoiceFileResult) filePatch.invoiceFileId = invoiceFileResult.fileId;
    if (statementFileResult && 'fileId' in statementFileResult) filePatch.statementFileId = statementFileResult.fileId;
    if (Object.keys(filePatch).length > 0) {
      await updateInvoice(id, filePatch as Partial<NewInvoice>);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] updateInvoice error:', msg);
    return { error: 'Error al actualizar la factura' };
  }

  revalidatePath('/admin/facturacion');
  return { success: true, id };
}

export async function deleteInvoiceAction(id: number): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  const role = (session.user.role ?? 'staff') as Role;
  try {
    assertCanDelete(role);
  } catch {
    return { error: 'Sin permiso para eliminar' };
  }
  try {
    const existing = await getInvoice(id);
    if (existing?.filePath) {
      try { await del(existing.filePath); } catch { /* ignore */ }
    }
    await deleteInvoice(id);
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] deleteInvoice error:', msg);
    return { error: 'Error al eliminar la factura' };
  }
}

export async function annulInvoiceAction(id: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    await updateInvoice(id, { status: 'anulada' });
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] annulInvoice error:', msg);
    return { error: 'Error al anular la factura' };
  }
}

export async function markInvoicePaidAction(id: number): Promise<ActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  try {
    await updateInvoice(id, { status: 'cobrada', paidDate: today });
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] markPaid error:', msg);
    return { error: 'Error al marcar como cobrada' };
  }
}
