'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { talentSocials } from '@/db/schema';
import { requireRole } from '@/lib/auth-guard';
import { parseSheetRows, diffAgainstRoster, type CurrentTalent } from '@/lib/utils/statsImport';

const PLATFORM_HEX: Record<string, string> = {
  youtube: '#FF0000',
  twitch: '#9146FF',
  twitter: '#1DA1F2',
  x: '#000000',
  instagram: '#E1306C',
  tiktok: '#000000',
  kick: '#53FC18',
  discord: '#5865F2',
  facebook: '#1877F2',
};

const importPayloadSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
  acceptedRowIndices: z.array(z.number().int()).min(1),
});

type ImportResult = {
  readonly error?: string;
  readonly success?: boolean;
  readonly applied?: number;
  readonly created?: number;
  readonly updated?: number;
  readonly skipped?: number;
};

export async function applyStatsImportAction(payload: unknown): Promise<ImportResult> {
  await requireRole('admin', '/admin/login');

  const parsed = importPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Payload inválido' };
  }

  const { rows, acceptedRowIndices } = parsed.data;
  const acceptedSet = new Set(acceptedRowIndices);

  const parsedRows = parseSheetRows(rows);

  const roster = await db.query.talents.findMany({
    with: {
      socials: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
    },
  });

  const currentRoster: CurrentTalent[] = roster.map((t) => ({
    id: t.id,
    name: t.name,
    socials: t.socials.map((s) => ({
      id: s.id,
      talentId: s.talentId,
      platform: s.platform,
      handle: s.handle,
      followersDisplay: s.followersDisplay,
      profileUrl: s.profileUrl,
      avgViewers: s.avgViewers,
    })),
  }));

  const diff = diffAgainstRoster(parsedRows, currentRoster);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of diff) {
    if (!acceptedSet.has(row.rowIndex)) {
      skipped++;
      continue;
    }
    if (row.status === 'no-talent-match' || row.status === 'unchanged') {
      skipped++;
      continue;
    }

    if (row.status === 'updated' && row.socialId) {
      const patch: Partial<typeof talentSocials.$inferInsert> = {};
      if (row.parsed.handle) patch.handle = row.parsed.handle;
      if (row.parsed.followersDisplay) patch.followersDisplay = row.parsed.followersDisplay;
      if (row.parsed.profileUrl !== null) patch.profileUrl = row.parsed.profileUrl;
      if (row.parsed.avgViewers !== null) patch.avgViewers = row.parsed.avgViewers;
      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }
      await db.update(talentSocials).set(patch).where(eq(talentSocials.id, row.socialId));
      updated++;
      continue;
    }

    if (row.status === 'new' && row.talentId) {
      if (!row.parsed.handle || !row.parsed.followersDisplay) {
        skipped++;
        continue;
      }
      const hexColor = PLATFORM_HEX[row.parsed.platform.toLowerCase()] ?? '#666666';
      await db.insert(talentSocials).values({
        talentId: row.talentId,
        platform: row.parsed.platform,
        handle: row.parsed.handle,
        followersDisplay: row.parsed.followersDisplay,
        profileUrl: row.parsed.profileUrl,
        avgViewers: row.parsed.avgViewers,
        hexColor,
      });
      created++;
      continue;
    }

    skipped++;
  }

  if (created > 0 || updated > 0) {
    revalidatePath('/admin/stats');
    revalidatePath('/admin/talents');
    revalidatePath('/talentos');
  }

  return {
    success: true,
    created,
    updated,
    skipped,
    applied: created + updated,
  };
}

export async function downloadStatsTemplateAction(): Promise<{ csv: string }> {
  await requireRole('admin', '/admin/login');
  const headers = ['Talent', 'Plataforma', 'Handle', 'Followers', 'URL perfil', 'CCV'];
  const example = ['Naow', 'youtube', 'Naow', '180K', 'https://youtube.com/@naow', ''];
  return { csv: `${headers.join(',')}\n${example.join(',')}` };
}
