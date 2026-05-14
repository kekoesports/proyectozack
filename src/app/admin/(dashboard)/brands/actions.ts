'use server';

import { requirePermission } from '@/lib/permissions';

// Portal de marcas eliminado — stub mantenido para compatibilidad de imports

export async function inviteBrandAction(
  _prev: Record<string, unknown>,
  _formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  await requirePermission('campanas', 'write');
  return { error: 'Funcionalidad no disponible.' };
}
