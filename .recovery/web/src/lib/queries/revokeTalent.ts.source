import { and, eq, getTableName, is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';
import { talents } from '@/db/schema/talents';
import { files } from '@/db/schema/files';
import { db } from '@/lib/db';
import type { RevokeTalentInput, RevokeTalentResult } from '@/lib/schemas/revokeTalent';

// Only the profile's own metadata may cascade. All other linked records protect history.
const PROFILE_METADATA = new Set([
  'talent_tags', 'talent_stats', 'talent_socials', 'talent_business', 'talent_verticals',
  'talent_live_status', 'talent_metric_snapshots', 'talent_channel_snapshots',
  'talent_content_performance',
]);

async function hasProtectedHistory(tx: Pick<typeof db, 'select'>, id: number): Promise<boolean> {
  for (const table of Object.values(schema)) {
    if (!is(table, PgTable) || PROFILE_METADATA.has(getTableName(table))) continue;
    for (const fk of getTableConfig(table).foreignKeys) {
      const reference = fk.reference();
      if (getTableName(reference.foreignTable) !== 'talents') continue;
      const column = reference.columns[0];
      // A new composite reference must be reviewed before allowing destructive deletion.
      if (!column || reference.columns.length !== 1) return true;
      const linked = await tx.select({ value: column }).from(table).where(eq(column, id)).limit(1);
      if (linked.length) return true;
    }
  }
  const attachments = await tx.select({ id: files.id }).from(files)
    .where(and(eq(files.relatedType, 'talent'), eq(files.relatedId, id))).limit(1);
  return attachments.length > 0;
}

export async function revokeTalentProfile(input: RevokeTalentInput, userId: string): Promise<RevokeTalentResult> {
  return db.transaction(async tx => {
    // Lock the profile before checking references so concurrent FK inserts cannot slip through.
    const [talent] = await tx.select({ id: talents.id, name: talents.name, slug: talents.slug, archivedAt: talents.archivedAt })
      .from(talents).where(eq(talents.id, input.id)).for('update');
    if (!talent) return { ok: false, error: 'El perfil ya no existe. Actualiza la lista.' };
    if (input.confirmation !== talent.name.trim()) {
      return { ok: false, error: 'El nombre no coincide con el perfil. Vuelve a confirmarlo.' };
    }
    if (input.mode === 'archive') {
      if (!talent.archivedAt) await tx.update(talents).set({ archivedAt: new Date(), archivedBy: userId }).where(eq(talents.id, talent.id));
    } else {
      if (await hasProtectedHistory(tx, talent.id)) {
        return { ok: false, error: 'Este perfil tiene historial vinculado. Archívalo para conservar sus tratos, documentos y relaciones.' };
      }
      await tx.delete(talents).where(eq(talents.id, talent.id));
    }
    return { ok: true, slug: talent.slug };
  });
}
