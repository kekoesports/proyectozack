'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAnyRole } from '@/lib/auth-guard';
import { insertSnapshot } from '@/lib/queries/analytics';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

const SnapshotInput = z.object({
  talentId: IdSchema,
  platform: z.string().min(1).max(40),
  metricType: z.string().min(1).max(40),
  value: z.coerce.number().nonnegative(),
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
});

export async function insertSnapshotAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const parsed = parseFormData(formData, SnapshotInput);
    if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };
    const { talentId, platform, metricType, value, snapshotDate } = parsed.data;

    await insertSnapshot({ talentId, platform, metricType, value, snapshotDate });

    revalidatePath(`/admin/talents/${talentId}`);
    return { success: true };
  } catch (err) {
    logRedacted('error', '[insertSnapshotAction] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al guardar snapshot' };
  }
}
