'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { requireRole } from '@/lib/auth-guard';
import { createInvoiceSchema, updateInvoiceSchema } from '@/lib/schemas/invoice';
import { createInvoice, updateInvoice, deleteInvoice, getInvoice } from '@/lib/queries/invoices';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly id?: number;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  return obj;
}

function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

function nullify<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === undefined ? null : v;
  return out;
}

async function uploadFile(file: File, folder: string): Promise<{ url: string; path: string }> {
  const year = new Date().getFullYear();
  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `invoices/${folder}/${year}/${Date.now()}-${safeName}`;
  const blob = await put(path, file, { access: 'public', contentType: file.type });
  return { url: blob.url, path };
}

async function validateAndUpload(
  file: unknown,
  folder: string,
): Promise<{ url: string; path: string } | null | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_MIME.includes(file.type)) return { error: 'Tipo de archivo no permitido (PDF, JPG, PNG, XLSX, CSV)' };
  if (file.size > MAX_FILE_BYTES) return { error: 'El archivo no puede superar 10 MB' };
  try {
    return await uploadFile(file, folder);
  } catch (err) {
    console.error('[admin] upload error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al subir el archivo' };
  }
}

export async function createInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole('admin', '/admin/login');

  const parsed = createInvoiceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const invoiceUpload = await validateAndUpload(formData.get('file'), parsed.data.kind);
  if (invoiceUpload && 'error' in invoiceUpload) return invoiceUpload;

  const receiptUpload = await validateAndUpload(formData.get('receiptFile'), 'receipts');
  if (receiptUpload && 'error' in receiptUpload) return receiptUpload;

  try {
    const values = nullify({
      ...parsed.data,
      fileUrl: invoiceUpload?.url,
      filePath: invoiceUpload?.path,
      receiptFileUrl: receiptUpload?.url,
      receiptFilePath: receiptUpload?.path,
    });
    const row = await createInvoice(values as Parameters<typeof createInvoice>[0]);
    revalidatePath('/admin/facturacion');
    return { success: true, id: row.id };
  } catch (err) {
    console.error('[admin] createInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear el movimiento' };
  }
}

export async function updateInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole('admin', '/admin/login');

  const parsed = updateInvoiceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, ...rest } = parsed.data;
  const existing = await getInvoice(id);

  const invoiceUpload = await validateAndUpload(formData.get('file'), rest.kind ?? existing?.kind ?? 'income');
  if (invoiceUpload && 'error' in invoiceUpload) return invoiceUpload;

  const receiptUpload = await validateAndUpload(formData.get('receiptFile'), 'receipts');
  if (receiptUpload && 'error' in receiptUpload) return receiptUpload;

  if (invoiceUpload && existing?.filePath) {
    try { await del(existing.filePath); } catch { /* ignore */ }
  }
  if (receiptUpload && existing?.receiptFilePath) {
    try { await del(existing.receiptFilePath); } catch { /* ignore */ }
  }

  try {
    const patch = compact({
      ...rest,
      ...(invoiceUpload ? { fileUrl: invoiceUpload.url, filePath: invoiceUpload.path } : {}),
      ...(receiptUpload ? { receiptFileUrl: receiptUpload.url, receiptFilePath: receiptUpload.path } : {}),
    });
    await updateInvoice(id, patch as Partial<Parameters<typeof updateInvoice>[1]>);
    revalidatePath('/admin/facturacion');
    return { success: true, id };
  } catch (err) {
    console.error('[admin] updateInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al actualizar el movimiento' };
  }
}

export async function deleteInvoiceAction(id: number): Promise<ActionState> {
  await requireRole('admin', '/admin/login');
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
    console.error('[admin] deleteInvoice error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar el movimiento' };
  }
}

export async function markInvoicePaidAction(id: number): Promise<ActionState> {
  await requireRole('admin', '/admin/login');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  try {
    const existing = await getInvoice(id);
    const newStatus = existing?.kind === 'expense' ? 'cobrada' : 'cobrada';
    await updateInvoice(id, { status: newStatus, paidDate: today });
    revalidatePath('/admin/facturacion');
    return { success: true };
  } catch (err) {
    console.error('[admin] markPaid error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al marcar como cobrado/pagado' };
  }
}
