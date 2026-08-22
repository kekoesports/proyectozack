import 'server-only';

import { eq } from 'drizzle-orm';

import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { env } from '@/lib/env';
import { buildContractVars, fillTemplate } from '@/lib/contractVariables';
import { generateContractPdf } from '@/lib/pdf/generateContractPdf';
import { db } from '@/lib/db';
import { getCampaignWithRelations } from '@/lib/queries/campaigns';
import { listContractTemplates, type ContractTemplate } from '@/lib/queries/contractTemplates';
import { createContract, getContractByCampaign } from '@/lib/queries/contracts';
import { deleteFile, uploadFile } from '@/lib/storage';
import {
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_TYPES,
  type DeliverableType,
} from '@/lib/schemas/deliverable';

export type EnsureCampaignContractDraftOutcome =
  | { readonly status: 'created'; readonly contractId: number; readonly templateId: number }
  | { readonly status: 'already_had_contract'; readonly contractId: number }
  | { readonly status: 'skipped'; readonly reason: string }
  | { readonly status: 'failed'; readonly reason: string };

function normalizedSector(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function desiredTemplateType(sector: string | null | undefined): string | null {
  const value = normalizedSector(sector);
  if (/casino|gambling|igaming|betting|apuesta/.test(value)) return 'casino';
  if (/marketplace/.test(value)) return 'marketplace';
  if (/cs2|skin/.test(value)) return 'cs2_cases';
  return null;
}

/** Selección determinista; evita escoger al azar entre plantillas equivalentes. */
export function selectAutomatedContractTemplate(
  templates: readonly ContractTemplate[],
  input: { readonly overrideId?: number; readonly sector?: string | null },
): ContractTemplate | null {
  const active = templates.filter((template) => template.isActive);
  if (input.overrideId !== undefined) {
    return active.find((template) => template.id === input.overrideId) ?? null;
  }

  const preferredType = desiredTemplateType(input.sector);
  if (preferredType) {
    const candidates = active.filter((template) => template.type === preferredType);
    // Dos plantillas del mismo tipo pueden pertenecer a marcas o contratos
    // distintos. Sin un override, elegir una de ellas por orden alfabético
    // sería una decisión legal arbitraria.
    if (candidates.length === 1) return candidates[0] ?? null;
  }

  const serviceAgreement = active.filter((template) => template.type === 'service_agreement');
  if (serviceAgreement.length === 1) return serviceAgreement[0] ?? null;

  const general = active.filter((template) => template.type === 'general');
  if (general.length === 1) return general[0] ?? null;
  return null;
}

function deliverableLabel(type: string): string {
  if ((DELIVERABLE_TYPES as readonly string[]).includes(type)) {
    return DELIVERABLE_TYPE_LABELS[type as DeliverableType];
  }
  return type.replaceAll('_', ' ');
}

function safeContractFilename(campaignName: string): string {
  const slug = campaignName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'trato';
  return `contrato-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

/**
 * Crea un PDF de contrato en estado draft después de la aprobación humana.
 *
 * Es best-effort e idempotente en la ruta normal: un fallo de plantilla,
 * almacenamiento o PDF nunca revierte el trato ni la hoja. Tampoco añade
 * firmantes ni llama a Resend; enviar el documento sigue requiriendo una
 * confirmación explícita desde el CRM.
 */
export async function ensureCampaignContractDraft(
  campaignId: number,
): Promise<EnsureCampaignContractDraftOutcome> {
  if (!env.AUTOMATION_CONTRACT_DRAFTS_ENABLED) {
    return { status: 'skipped', reason: 'automatic-contract-drafts-disabled' };
  }

  try {
    const existing = await getContractByCampaign(campaignId);
    if (existing) return { status: 'already_had_contract', contractId: existing.id };

    const campaign = await getCampaignWithRelations(campaignId);
    if (!campaign) return { status: 'skipped', reason: 'campaign-not-found' };

    const templates = await listContractTemplates();
    const template = selectAutomatedContractTemplate(templates, {
      ...(env.AUTOMATION_CONTRACT_TEMPLATE_ID !== undefined
        ? { overrideId: env.AUTOMATION_CONTRACT_TEMPLATE_ID }
        : {}),
      sector: campaign.sector ?? campaign.brand.sector,
    });
    if (!template) {
      return { status: 'skipped', reason: 'no-unambiguous-active-template' };
    }

    const trackers = await db
      .select({
        type: dealDeliverableTrackers.deliverableType,
        targetCount: dealDeliverableTrackers.targetCount,
        notes: dealDeliverableTrackers.notes,
      })
      .from(dealDeliverableTrackers)
      .where(eq(dealDeliverableTrackers.campaignId, campaignId));

    const deliverables = trackers
      .filter((tracker) => tracker.targetCount > 0)
      .map((tracker) => {
        const detail = tracker.notes?.trim() || deliverableLabel(tracker.type);
        return `- ${tracker.targetCount} × ${detail}`;
      })
      .join('\n');

    const vars: Record<string, string> = {
      ...buildContractVars(campaign),
      ...(deliverables ? { deliverables } : {}),
    };
    const content = fillTemplate(template.content, vars);
    const filename = safeContractFilename(campaign.name);
    const pdf = await generateContractPdf({
      templateName: template.name,
      content,
      metadata: [
        { label: 'Trato', value: campaign.name },
        { label: 'Marca', value: vars.brand_name ?? '—' },
        { label: 'Talento', value: vars.influencer_name ?? '—' },
        { label: 'Importe', value: `${vars.total_amount ?? '—'} ${vars.currency ?? ''}`.trim() },
        { label: 'Fecha inicio', value: vars.start_date ?? '—' },
        { label: 'Fecha fin', value: vars.end_date ?? '—' },
      ],
    });

    const stored = await uploadFile({
      filename,
      data: pdf,
      contentType: 'application/pdf',
      visibility: 'private',
      prefix: 'contracts',
    });

    try {
      const row = await createContract({
        campaignId,
        fileUrl: stored.publicUrl ?? stored.storageKey,
        filePath: stored.storageKey,
        fileName: filename,
        signedFileUrl: null,
        status: 'draft',
        sentAt: null,
        signedAt: null,
        notes: `Borrador automático desde plantilla ${template.id}. Revisar antes de añadir firmantes o enviar.`,
        createdByUserId: null,
      });
      return { status: 'created', contractId: row.id, templateId: template.id };
    } catch (err) {
      await deleteFile(stored.storageKey).catch(() => {});
      throw err;
    }
  } catch (err) {
    console.error(`[contract-draft] no se pudo crear el borrador del trato ${campaignId}`);
    return { status: 'failed', reason: err instanceof Error ? err.message : 'unknown-error' };
  }
}
