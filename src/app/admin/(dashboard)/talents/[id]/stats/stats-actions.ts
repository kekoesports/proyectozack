'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { insertSnapshot } from '@/lib/queries/analytics';

export async function insertSnapshotAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const talentId = Number(formData.get('talentId'));
    const platform = formData.get('platform') as string | null;
    const metricType = formData.get('metricType') as string | null;
    const value = Number(formData.get('value'));
    const snapshotDate = formData.get('snapshotDate') as string | null;

    if (!talentId || !platform || !metricType || !snapshotDate) {
      return { success: false, error: 'Faltan campos requeridos' };
    }
    if (isNaN(value) || value < 0) {
      return { success: false, error: 'Valor inválido' };
    }

    await insertSnapshot({ talentId, platform, metricType, value, snapshotDate });

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    console.error('[insertSnapshotAction] error:', err instanceof Error ? err.message : 'unknown');
    return { success: false, error: err instanceof Error ? err.message : 'Error al guardar snapshot' };
  }
}
