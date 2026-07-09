'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';
import { createCampaignSchema, updateCampaignSchema } from '@/lib/schemas/campaign';
import { parseDeliverablesJson } from '@/lib/schemas/campaign-deliverables';
import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
  unarchiveCampaign,
  assertCanEditCampaign,
} from '@/lib/queries/campaigns';
import { syncCampaignDeliverables } from '@/lib/queries/campaign-deliverables-sync';
import {
  syncCampaignSheet,
  normalizeTrackingSheetInput,
  type SyncResult,
} from '@/lib/queries/campaign-sheet-sync';
import { db } from '@/lib/db';
import { campaigns } from '@/db/schema/campaigns';
import { eq } from 'drizzle-orm';

import { compact } from '@/lib/utils/objects';

import { logRedacted } from '@/lib/log';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';

import type { CreateCampaignInput } from '@/lib/queries/campaigns';

// ── createCampaignAction ──────────────────────────────────────────────────────

export async function createCampaignAction(
  formData: FormData,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  try {
    const session = await requirePermission('campanas', 'read');

    const parsed = parseFormData(formData, createCampaignSchema);
    if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };

    const input = compact({
      ...parsed.data,
      createdByUserId: session.user.id,
    }) as CreateCampaignInput;

    const campaign = await createCampaign(input);

    // Entregables (dealDeliverableTrackers) — se sincronizan post-create con
    // el id ya conocido. parseDeliverablesJson nunca lanza; retorna [] si el
    // payload está ausente o malformado, así no rompe el create básico.
    const deliverables = parseDeliverablesJson(formData.get('deliverables_json'));
    if (deliverables.length > 0) {
      await syncCampaignDeliverables(campaign.id, deliverables);
    }

    // Tracking sheet (PR2). Campo aparte del schema principal: se persiste
    // solo si vino en el form. Empty string → null (sin tracking).
    if (formData.has('trackingSheetUrl')) {
      const raw = String(formData.get('trackingSheetUrl') ?? '');
      const normalized = normalizeTrackingSheetInput(raw);
      await db
        .update(campaigns)
        .set({
          trackingSheetUrl: normalized.trackingSheetUrl,
          trackingSheetSpreadsheetId: normalized.trackingSheetSpreadsheetId,
          trackingSheetGid: normalized.trackingSheetGid,
          trackingSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaign.id));
    }

    revalidatePath('/admin/campanas');
    return { success: true, id: campaign.id };
  } catch (err) {
    logRedacted('error', '[createCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al crear campaña' };
  }
}

// ── updateCampaignAction ──────────────────────────────────────────────────────

export async function updateCampaignAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requirePermission('campanas', 'read');

    const parsed = parseFormData(formData, updateCampaignSchema);
    if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };

    const { id, ...rest } = parsed.data;

    await assertCanEditCampaign(id, { userId: session.user.id, role: session.user.role });

    await updateCampaign(id, compact(rest) as Partial<CreateCampaignInput>);

    // Entregables — sincroniza siempre (incluso array vacío) para que quitar
    // todas las filas cancele los trackers activos.
    const deliverables = parseDeliverablesJson(formData.get('deliverables_json'));
    // Solo procesa si el input trajo el campo (para no cancelar en actualizaciones
    // parciales que ni siquiera envían deliverables_json).
    if (formData.has('deliverables_json')) {
      await syncCampaignDeliverables(id, deliverables);
    }

    // Tracking sheet (PR2). Solo se persiste si el form trae el campo, para
    // no borrar el link existente en actualizaciones parciales.
    if (formData.has('trackingSheetUrl')) {
      const raw = String(formData.get('trackingSheetUrl') ?? '');
      const normalized = normalizeTrackingSheetInput(raw);
      await db
        .update(campaigns)
        .set({
          trackingSheetUrl: normalized.trackingSheetUrl,
          trackingSheetSpreadsheetId: normalized.trackingSheetSpreadsheetId,
          trackingSheetGid: normalized.trackingSheetGid,
          trackingSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, id));
    }

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[updateCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al actualizar campaña' };
  }
}

// ── archiveCampaignAction (soft delete — decisión #4) ────────────────────────

export async function archiveCampaignAction(
  id: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requirePermission('campanas', 'read');

    if (session.user.role === 'staff') throw new Error(`forbidden:delete:${session.user.role}`);

    await assertCanEditCampaign(id, { userId: session.user.id, role: session.user.role });

    await archiveCampaign(id);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[archiveCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al archivar campaña' };
  }
}

// ── unarchiveCampaignAction ───────────────────────────────────────────────────

export async function unarchiveCampaignAction(
  id: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requirePermission('campanas', 'read');

    if (session.user.role === 'staff') throw new Error(`forbidden:delete:${session.user.role}`);

    await unarchiveCampaign(id);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[unarchiveCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al desarchivar campaña' };
  }
}

// ── syncCampaignSheetAction (PR2 — tratos sheet-link tracking) ───────────────

/**
 * Sincroniza los currentCount de los trackers activos del trato leyendo la
 * Google Sheet asociada al campaign. Nunca lanza — siempre devuelve un
 * ActionResult para que la UI pueda mostrar el mensaje humano-readable.
 *
 * Requiere permiso `campanas.write`.
 */
export async function syncCampaignSheetAction(
  campaignId: number,
): Promise<SyncResult> {
  try {
    await requirePermission('campanas', 'write');
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return { ok: false, error: 'ID de trato inválido.' };
    }
    const result = await syncCampaignSheet(campaignId);
    revalidatePath('/admin/campanas');
    return result;
  } catch (err) {
    logRedacted('error', '[syncCampaignSheetAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { ok: false, error: msg !== 'unknown' ? msg : 'Error al sincronizar la hoja.' };
  }
}

// NO hay deleteCampaignAction (decisión #4 — soft delete)
// NO hay markBrandPaidAction / markTalentPaidAction (decisión #5 — derivado desde invoices)
