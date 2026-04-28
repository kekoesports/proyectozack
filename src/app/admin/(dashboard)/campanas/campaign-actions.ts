'use server';

import { revalidatePath } from 'next/cache';
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  markCampaignBrandPaid,
  markCampaignTalentPaid,
} from '@/lib/queries/campaigns';
import { requireAnyRole } from '@/lib/auth-guard';

export async function createCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const amountBrand = formData.get('amountBrand') as string | null;
  const amountTalent = formData.get('amountTalent') as string | null;
  const agencyFee = formData.get('agencyFee') as string | null;
  const agencyFeePercent = formData.get('agencyFeePercent') as string | null;
  const brandIdRaw = formData.get('brandId') as string | null;
  const talentIdRaw = formData.get('talentId') as string | null;

  await createCampaign({
    brandId: brandIdRaw ? Number(brandIdRaw) : null,
    talentId: talentIdRaw ? Number(talentIdRaw) : null,
    name: (formData.get('name') as string).trim(),
    sector: (formData.get('sector') as string | null) ?? null,
    geo: (formData.get('geo') as string | null) ?? null,
    status: (formData.get('status') as string | null) as 'negociacion' | 'activa' | 'pausada' | 'finalizada' | 'cancelada' ?? 'negociacion',
    startDate: (formData.get('startDate') as string | null) ?? null,
    endDate: (formData.get('endDate') as string | null) ?? null,
    description: (formData.get('description') as string | null) ?? null,
    deliverables: (formData.get('deliverables') as string | null) ?? null,
    notes: (formData.get('notes') as string | null) ?? null,
    amountBrand: amountBrand || null,
    amountTalent: amountTalent || null,
    agencyFee: agencyFee || null,
    agencyFeePercent: agencyFeePercent || null,
    responsibleUserId: (formData.get('responsibleUserId') as string | null) ?? null,
  });

  revalidatePath('/admin/campanas');
}

export async function updateCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const id = Number(formData.get('id'));

  const brandIdRaw = formData.get('brandId') as string | null;
  const talentIdRaw = formData.get('talentId') as string | null;

  await updateCampaign(id, {
    brandId: brandIdRaw ? Number(brandIdRaw) : null,
    talentId: talentIdRaw ? Number(talentIdRaw) : null,
    name: (formData.get('name') as string).trim(),
    sector: (formData.get('sector') as string | null) ?? null,
    geo: (formData.get('geo') as string | null) ?? null,
    status: (formData.get('status') as 'negociacion' | 'activa' | 'pausada' | 'finalizada' | 'cancelada'),
    startDate: (formData.get('startDate') as string | null) ?? null,
    endDate: (formData.get('endDate') as string | null) ?? null,
    description: (formData.get('description') as string | null) ?? null,
    deliverables: (formData.get('deliverables') as string | null) ?? null,
    notes: (formData.get('notes') as string | null) ?? null,
    amountBrand: (formData.get('amountBrand') as string | null) ?? null,
    amountTalent: (formData.get('amountTalent') as string | null) ?? null,
    agencyFee: (formData.get('agencyFee') as string | null) ?? null,
    agencyFeePercent: (formData.get('agencyFeePercent') as string | null) ?? null,
    responsibleUserId: (formData.get('responsibleUserId') as string | null) ?? null,
  });

  revalidatePath('/admin/campanas');
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const id = Number(formData.get('id'));
  await deleteCampaign(id);
  revalidatePath('/admin/campanas');
}

export async function markBrandPaidAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const id = Number(formData.get('id'));
  const amount = formData.get('amount') as string;
  const method = formData.get('method') as string;
  await markCampaignBrandPaid(id, amount, method);
  revalidatePath('/admin/campanas');
}

export async function markTalentPaidAction(formData: FormData): Promise<void> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const id = Number(formData.get('id'));
  const amount = formData.get('amount') as string;
  const method = formData.get('method') as string;
  await markCampaignTalentPaid(id, amount, method);
  revalidatePath('/admin/campanas');
}
