'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

import { requirePermission } from '@/lib/permissions';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { CreatorOutreachError, sendCreatorOutreach } from '@/lib/email/creatorOutreach';
import { getCreatorOutreachForSource } from '@/lib/queries/creatorOutreach';
import { sendTargetOutreachSchema } from '@/lib/schemas/creator-outreach';
import { logRedacted } from '@/lib/log';
import { isHostOrSubdomain } from '@/lib/utils/hostnames';
import {
  upsertTargetsFromCSV,
  updateTargetStatus,
  updateTargetNotes,
  deleteTargets,
  deleteAllTargets,
  assignTargetsToBrand,
  bulkUpdateStatus,
} from '@/lib/queries/targets';
import {
  csvTargetRowSchema,
  updateTargetStatusSchema,
  updateTargetNotesSchema,
  importTargetsCsvSchema,
  deleteTargetsSchema,
  assignTargetsSchema,
  bulkStatusSchema,
} from '@/lib/schemas/target';

const REVALIDATE = '/admin/targets';

export type TargetOutreachActionResult = { readonly ok: true; readonly replyTracking: boolean } | { readonly ok: false; readonly error: string };

export async function sendTargetOutreachAction(input: unknown): Promise<TargetOutreachActionResult> {
  const session = await requirePermission('targets', 'write');
  const parsed = sendTargetOutreachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa el asunto y el mensaje.' };
  try {
    const result = await sendCreatorOutreach({ ...parsed.data, sourceType: 'target' }, session.user.id);
    revalidatePath(REVALIDATE);
    return { ok: true, replyTracking: result.replyTracking };
  } catch (error) {
    logRedacted('error', '[targets] sendTargetOutreachAction failed:', error);
    if (error instanceof CreatorOutreachError && error.code === 'suppressed') {
      return { ok: false, error: 'Este contacto está dado de baja o su dirección está suprimida.' };
    }
    if (error instanceof CreatorOutreachError && error.code === 'not_found') {
      return { ok: false, error: 'El lead no existe o no tiene un email válido.' };
    }
    return { ok: false, error: 'No se pudo enviar. El lead no se ha marcado como contactado.' };
  }
}

export async function getTargetOutreachAction(input: unknown): Promise<{
  readonly ok: true;
  readonly thread: {
    readonly status: string;
    readonly lastReplySummary: string | null;
    readonly suggestedReply: string | null;
    readonly messages: readonly { readonly id: number; readonly direction: string; readonly status: string; readonly subject: string; readonly textBody: string; readonly occurredAt: string }[];
  } | null;
} | { readonly ok: false; readonly error: string }> {
  await requirePermission('targets', 'read');
  const parsed = updateTargetStatusSchema.shape.id.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Lead inválido.' };
  const thread = await getCreatorOutreachForSource('target', parsed.data);
  return {
    ok: true,
    thread: thread ? {
      status: thread.status,
      lastReplySummary: thread.lastReplySummary,
      suggestedReply: thread.suggestedReply,
      messages: thread.messages.map((message) => ({ ...message, occurredAt: message.occurredAt.toISOString() })),
    } : null,
  };
}

// ─── CSV header aliases ───────────────────────────────────────────────────────

const HEADER_ALIASES: Record<string, string> = {
  // Spanish aliases
  nombre: 'full_name',
  seguidores: 'followers',
  seguidos: 'following',
  tipo: 'biography',
  url: 'profile_url',
  biografia: 'biography',
  plataforma: 'platform',
  categoria: 'business_category',
  publicaciones: 'posts',
  // Common variations
  name: 'full_name',
  display_name: 'full_name',
  displayname: 'full_name',
  user: 'username',
  handle: 'username',
  canal: 'username',
  channel: 'username',
  subscriber_count: 'followers',
  subscribers: 'followers',
  follower_count: 'followers',
  bio: 'biography',
  description: 'biography',
  profile_url: 'profile_url',
  link: 'profile_url',
};

function normalizeHeader(h: string): string {
  const key = h.toLowerCase().trim();
  return HEADER_ALIASES[key] ?? key;
}

function detectPlatformFromUrl(url: string): string | undefined {
  if (isHostOrSubdomain(url, 'instagram.com')) return 'instagram';
  if (isHostOrSubdomain(url, 'youtube.com') || isHostOrSubdomain(url, 'youtu.be')) return 'youtube';
  if (isHostOrSubdomain(url, 'twitch.tv')) return 'twitch';
  if (isHostOrSubdomain(url, 'kick.com')) return 'kick';
  return undefined;
}

// ─── CSV import ───────────────────────────────────────────────────────────────

export type ImportCsvResult = {
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  assigned: number;
};

const EMPTY_IMPORT: ImportCsvResult = { total: 0, inserted: 0, updated: 0, errors: 0, assigned: 0 };

export async function importCSVAction(formData: FormData): Promise<ImportCsvResult> {
  await requirePermission('targets', 'delete');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return EMPTY_IMPORT;

  const parsed = parseFormData(formData, importTargetsCsvSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] importCSVAction validation failed:', firstError(parsed.fieldErrors));
    return EMPTY_IMPORT;
  }
  const brandUserId = parsed.data.brandUserId?.trim() ?? '';

  const text = await file.text();
  const lines = text.split('\n').filter((l) => l.trim());
  const [headerLine, ...dataLines] = lines;
  if (!headerLine || dataLines.length === 0) return EMPTY_IMPORT;

  const rawHeaders = parseCsvLine(headerLine).map((h) => h.trim());
  const headers = rawHeaders.map(normalizeHeader);
  const batchId = randomUUID().slice(0, 8);

  const validRows = [];
  let errors = 0;

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = cols[idx] ?? '';
    });

    if (!raw.platform && raw.profile_url) {
      const detected = detectPlatformFromUrl(raw.profile_url);
      if (detected) raw.platform = detected;
    }

    const rowParsed = csvTargetRowSchema.safeParse(raw);
    if (rowParsed.success) {
      validRows.push(rowParsed.data);
    } else {
      errors++;
    }
  }

  const { inserted, updated, ids } = await upsertTargetsFromCSV(validRows, batchId);
  let assigned = 0;

  if (brandUserId && ids.length > 0) {
    const result = await assignTargetsToBrand(brandUserId, ids);
    assigned = result.assigned;
  }

  revalidatePath(REVALIDATE);
  revalidatePath('/marcas');

  return { total: validRows.length + errors, inserted, updated, errors, assigned };
}

// ─── Status update ────────────────────────────────────────────────────────────

export async function updateStatusAction(formData: FormData): Promise<void> {
  const session = await requirePermission('targets', 'write');

  const parsed = parseFormData(formData, updateTargetStatusSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] updateStatusAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await updateTargetStatus(parsed.data.id, parsed.data.status, session.user.id);
  revalidatePath(REVALIDATE);
}

// ─── Notes update ─────────────────────────────────────────────────────────────

export async function updateNotesAction(formData: FormData): Promise<void> {
  await requirePermission('targets', 'write');

  const parsed = parseFormData(formData, updateTargetNotesSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] updateNotesAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await updateTargetNotes(parsed.data.id, parsed.data.notes);
  revalidatePath(REVALIDATE);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTargetsAction(formData: FormData): Promise<void> {
  const session = await requirePermission('targets', 'write');

  const parsed = parseFormData(formData, deleteTargetsSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] deleteTargetsAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await deleteTargets(parsed.data.ids, session.user.id);
  revalidatePath(REVALIDATE);
  revalidatePath('/marcas');
}


export async function assignTargetsToBrandAction(
  formData: FormData,
): Promise<{ assigned: number; updated: number }> {
  await requirePermission('targets', 'delete');

  const parsed = parseFormData(formData, assignTargetsSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] assignTargetsToBrandAction validation failed:', firstError(parsed.fieldErrors));
    return { assigned: 0, updated: 0 };
  }

  const result = await assignTargetsToBrand(parsed.data.brandUserId, parsed.data.ids);
  revalidatePath(REVALIDATE);
  revalidatePath('/marcas');
  return { assigned: result.assigned, updated: 0 };
}

// ─── Delete all ──────────────────────────────────────────────────────────────

export async function deleteAllTargetsAction(): Promise<void> {
  const session = await requirePermission('targets', 'delete');
  await deleteAllTargets(session.user.id);
  revalidatePath(REVALIDATE);
  revalidatePath('/marcas');
}

// ─── Bulk status update ───────────────────────────────────────────────────────

export async function bulkUpdateStatusAction(ids: number[], status: string): Promise<void> {
  const session = await requirePermission('targets', 'write');

  const parsed = bulkStatusSchema.safeParse({ ids, status });
  if (!parsed.success) {
    logRedacted('warn', '[targets] bulkUpdateStatusAction validation failed');
    return;
  }

  await bulkUpdateStatus(parsed.data.ids, parsed.data.status, session.user.id);
  revalidatePath(REVALIDATE);
}

// ─── CSV line parser (handles quoted fields) ──────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === undefined) break;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
