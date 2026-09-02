'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import { setSlashCardOwnerLabel } from '@/lib/queries/slashAccounting';

const ownerSchema = z.object({
  cardId: z.coerce.number().int().positive(),
  issuerCompanyId: z.coerce.number().int().positive(),
  ownerLabel: z.string().trim().min(1).max(200),
});

export async function updateSlashCardOwnerAction(formData: FormData): Promise<void> {
  await requireFinancialPageSecurity('write');
  const parsed = ownerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setSlashCardOwnerLabel(
    parsed.data.cardId,
    parsed.data.issuerCompanyId,
    parsed.data.ownerLabel,
  );
  revalidatePath('/admin/facturacion/bancos/slash');
}
