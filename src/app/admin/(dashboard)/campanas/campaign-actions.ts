'use server';

import { revalidatePath } from 'next/cache';
import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
} from '@/lib/queries/campaigns';
import { requireAnyRole } from '@/lib/auth-guard';
import type { CampaignStatus, CampaignActionType } from '@/lib/schemas/campaign';

export async function createCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const amountBrand = formData.get('amountBrand') as string | null;
  const amountTalent = formData.get('amountTalent') as string | null;
  const brandIdRaw = formData.get('brandId') as string | null;
  const talentIdRaw = formData.get('talentId') as string | null;

  const brandId = brandIdRaw ? Number(brandIdRaw) : 0;
  const talentId = talentIdRaw ? Number(talentIdRaw) : 0;

  if (!brandId || !talentId) return;

  const createInput = {
    brandId,
    talentId,
    name: (formData.get('name') as string).trim(),
    actionType: ((formData.get('actionType') as string | null) ?? 'otro') as CampaignActionType,
    status: ((formData.get('status') as string | null) ?? 'propuesta') as CampaignStatus,
    amountBrand: amountBrand ? Number(amountBrand) : 0,
    amountTalent: amountTalent ? Number(amountTalent) : 0,
  };
  const sector = (formData.get('sector') as string | null);
  const geo = (formData.get('geo') as string | null);
  const startDate = (formData.get('startDate') as string | null);
  const endDate = (formData.get('endDate') as string | null);
  const notes = (formData.get('notes') as string | null);
  const responsibleUserId = (formData.get('responsibleUserId') as string | null);

  await createCampaign({
    ...createInput,
    ...(sector ? { sector } : {}),
    ...(geo ? { geo } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(notes ? { notes } : {}),
    ...(responsibleUserId ? { responsibleUserId } : {}),
  });

  revalidatePath('/admin/campanas');
}

export async function updateCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const id = Number(formData.get('id'));

  const brandIdRaw = formData.get('brandId') as string | null;
  const talentIdRaw = formData.get('talentId') as string | null;
  const amountBrand = formData.get('amountBrand') as string | null;
  const amountTalent = formData.get('amountTalent') as string | null;

  const patch: Parameters<typeof updateCampaign>[1] = {
    name: (formData.get('name') as string).trim(),
  };
  if (brandIdRaw) patch.brandId = Number(brandIdRaw);
  if (talentIdRaw) patch.talentId = Number(talentIdRaw);
  const updateSector = formData.get('sector') as string | null;
  const updateGeo = formData.get('geo') as string | null;
  const updateStatus = formData.get('status') as string | null;
  const updateStartDate = formData.get('startDate') as string | null;
  const updateEndDate = formData.get('endDate') as string | null;
  const updateNotes = formData.get('notes') as string | null;
  const updateResponsible = formData.get('responsibleUserId') as string | null;
  if (updateSector) patch.sector = updateSector;
  if (updateGeo) patch.geo = updateGeo;
  if (updateStatus) patch.status = updateStatus as CampaignStatus;
  if (updateStartDate) patch.startDate = updateStartDate;
  if (updateEndDate) patch.endDate = updateEndDate;
  if (updateNotes) patch.notes = updateNotes;
  if (updateResponsible) patch.responsibleUserId = updateResponsible;
  if (amountBrand) patch.amountBrand = Number(amountBrand);
  if (amountTalent) patch.amountTalent = Number(amountTalent);

  await updateCampaign(id, patch);

  revalidatePath('/admin/campanas');
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const id = Number(formData.get('id'));
  // Los tratos se archivan (soft-delete) en lugar de borrarse para preservar datos históricos.
  await archiveCampaign(id);
  revalidatePath('/admin/campanas');
}

// El estado de cobro/pago del trato se deriva automáticamente de los movimientos de facturación
// vinculados al trato (via getCampaignPaymentStatus, que suma invoices por campaignId).
// El flujo correcto es: registrar movimiento en Facturación → estado del trato se actualiza solo.
export async function markBrandPaidAction(_formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  revalidatePath('/admin/campanas');
}

export async function markTalentPaidAction(_formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  revalidatePath('/admin/campanas');
}
