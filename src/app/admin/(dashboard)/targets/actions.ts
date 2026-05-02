'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

import { requireRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import {
  upsertTargetsFromCSV,
  updateTargetStatus,
  updateTargetNotes,
  deleteTargets,
  deleteAllTargets,
  assignTargetsToBrand,
} from '@/lib/queries/targets';
import {
  csvTargetRowSchema,
  updateTargetStatusSchema,
  updateTargetNotesSchema,
  importTargetsCsvSchema,
  deleteTargetsSchema,
  assignTargetsSchema,
} from '@/lib/schemas/target';

const REVALIDATE = '/admin/targets';

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
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitch.tv')) return 'twitch';
  if (url.includes('kick.com')) return 'kick';
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
  await requireRole('admin', '/admin/login');

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
  if (lines.length < 2) return EMPTY_IMPORT;

  const rawHeaders = parseCsvLine(lines[0]!).map((h) => h.trim());
  const headers = rawHeaders.map(normalizeHeader);
  const batchId = randomUUID().slice(0, 8);

  const validRows = [];
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
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
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, updateTargetStatusSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] updateStatusAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await updateTargetStatus(parsed.data.id, parsed.data.status);
  revalidatePath(REVALIDATE);
}

// ─── Notes update ─────────────────────────────────────────────────────────────

export async function updateNotesAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');

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
  await requireRole('admin', '/admin/login');

  const parsed = parseFormData(formData, deleteTargetsSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[targets] deleteTargetsAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await deleteTargets(parsed.data.ids);
  revalidatePath(REVALIDATE);
}


export async function assignTargetsToBrandAction(
  formData: FormData,
): Promise<{ assigned: number; updated: number }> {
  await requireRole('admin', '/admin/login');

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
  await requireRole('admin', '/admin/login');
  await deleteAllTargets();
  revalidatePath(REVALIDATE);
  revalidatePath('/marcas');
}

// ─── CSV line parser (handles quoted fields) ──────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
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
