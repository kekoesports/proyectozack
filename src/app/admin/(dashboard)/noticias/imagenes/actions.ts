'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { uploadNewsImage, deleteNewsImage } from '@/lib/news/images';

export type UploadActionState =
  | { readonly ok: true; readonly url: string; readonly filename: string }
  | { readonly ok: false; readonly error: string };

export async function uploadNewsImageAction(formData: FormData): Promise<UploadActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const file = formData.get('file');
  const slugRaw = formData.get('slug');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No se envió ningún archivo válido.' };
  }
  const customSlug = typeof slugRaw === 'string' ? slugRaw : undefined;

  const result = await uploadNewsImage(file, customSlug);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/admin/noticias/imagenes');
  return { ok: true, url: result.image.url, filename: result.image.filename };
}

export type DeleteActionState = { readonly ok: true } | { readonly ok: false; readonly error: string };

export async function deleteNewsImageAction(formData: FormData): Promise<DeleteActionState> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const url = formData.get('url');
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return { ok: false, error: 'URL inválida.' };
  }

  const result = await deleteNewsImage(url);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/admin/noticias/imagenes');
  return { ok: true };
}
