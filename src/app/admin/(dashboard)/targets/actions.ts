'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
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
} from '@/lib/schemas/target';
import { randomUUID } from 'crypto';

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

export async function importCSVAction(
  formData: FormData,
): Promise<{ total: number; inserted: number; updated: number; errors: number; assigned: number }> {
  await requireRole('admin', '/admin/login');

  const file = formData.get('file') as File | null;
  const brandUserId = (formData.get('brandUserId') as string | null)?.trim() ?? '';
  if (!file) return { total: 0, inserted: 0, updated: 0, errors: 0, assigned: 0 };

  const text = await file.text();
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { total: 0, inserted: 0, updated: 0, errors: 0, assigned: 0 };

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

    // Detect platform from URL if not explicitly provided
    if (!raw.platform && raw.profile_url) {
      const detected = detectPlatformFromUrl(raw.profile_url);
      if (detected) raw.platform = detected;
    }

    const parsed = csvTargetRowSchema.safeParse(raw);
    if (parsed.success) {
      validRows.push(parsed.data);
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

  const parsed = updateTargetStatusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
  });
  if (!parsed.success) return;

  await updateTargetStatus(parsed.data.id, parsed.data.status);
  revalidatePath(REVALIDATE);
}

// ─── Notes update ─────────────────────────────────────────────────────────────

export async function updateNotesAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');

  const parsed = updateTargetNotesSchema.safeParse({
    id: formData.get('id'),
    notes: formData.get('notes') ?? '',
  });
  if (!parsed.success) return;

  await updateTargetNotes(parsed.data.id, parsed.data.notes);
  revalidatePath(REVALIDATE);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTargetsAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');

  const raw = formData.get('ids') as string | null;
  if (!raw) return;

  const ids = raw
    .split(',')
    .map(Number)
    .filter((n) => n > 0);

  await deleteTargets(ids);
  revalidatePath(REVALIDATE);
}


export async function assignTargetsToBrandAction(
  formData: FormData,
): Promise<{ assigned: number; updated: number }> {
  await requireRole('admin', '/admin/login');

  const rawIds = formData.get('ids') as string | null;
  const brandUserId = formData.get('brandUserId') as string | null;
  if (!rawIds || !brandUserId) return { assigned: 0, updated: 0 };

  const ids = rawIds
    .split(',')
    .map(Number)
    .filter((n) => n > 0);

  const result = await assignTargetsToBrand(brandUserId, ids);
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
