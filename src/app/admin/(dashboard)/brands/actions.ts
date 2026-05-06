'use server';

import { requireAnyRole } from '@/lib/auth-guard';

// Portal de marcas eliminado — stub mantenido para compatibilidad de imports

export async function inviteBrandAction(
  _prev: Record<string, unknown>,
  _formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  return { error: 'Funcionalidad no disponible.' };
}
