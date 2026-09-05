import { randomUUID } from 'node:crypto';
import { and, eq, isNull, lt, lte, or } from 'drizzle-orm';
import { creatorSearchProfiles } from '@/db/schema';
import { db } from '@/lib/db';
import { creatorSearchProfileSchema } from '@/lib/schemas/creator-search-profile';
import { nextCreatorSearchAt } from '@/lib/targets/search-profile';
import { getCreatorProviderReadiness, recordCreatorPreflight } from '@/lib/queries/creatorProviderReadiness';
import { listDueCreatorSearchProfiles } from '@/lib/queries/creatorSearchProfiles';
import { runCreatorTargetDiscovery } from '@/lib/services/creatorTargetDiscovery';
import { createCreatorBudgetGuard } from '@/lib/queries/creatorDiscoveryBudget';
import { CreatorDiscoveryReportingPendingError } from './creator-reporting-status';

export async function runCreatorSearchProfile(id: number, trigger: 'manual' | 'scheduled'): Promise<{ ok: boolean; error: string | null }> {
  const now = new Date(), leaseToken = randomUUID();
  const [profile] = await db.update(creatorSearchProfiles)
    .set({ leaseToken, leaseUntil: new Date(now.getTime() + 10 * 60_000) })
    .where(and(eq(creatorSearchProfiles.id, id),
      trigger === 'scheduled' ? eq(creatorSearchProfiles.enabled, true) : undefined,
      trigger === 'scheduled' ? lte(creatorSearchProfiles.nextRunAt, now) : undefined,
      or(isNull(creatorSearchProfiles.leaseUntil), lt(creatorSearchProfiles.leaseUntil, now))))
    .returning();
  if (!profile) return { ok: false, error: 'El perfil no existe, está pausado o ya tiene una ejecución en curso.' };
  let attempted = false;
  const parsed = creatorSearchProfileSchema.safeParse(profile.config);
  try {
    if (!parsed.success) return { ok: false, error: 'La configuración guardada no es válida. Edita el perfil.' };
    const gates = await getCreatorProviderReadiness();
    await recordCreatorPreflight(gates);
    const selected = gates.filter((gate) => parsed.data.platforms.includes(gate.platform));
    if (!selected.some((gate) => gate.ready)) return { ok: false, error: selected.map((gate) => gate.message).join(' ') };
    attempted = true;
    const result = await runCreatorTargetDiscovery(trigger, parsed.data, {
      beforeRequest: createCreatorBudgetGuard(`profile:${id}`, parsed.data.searchPagesPerDay),
    });
    return { ok: result.status !== 'failed', error: result.status === 'success' ? null
      : 'Ejecución parcial o fallida: revisa el registro por plataforma. No se han contactado creadores.' };
  } catch (error) {
    if (error instanceof CreatorDiscoveryReportingPendingError) return { ok: false,
      error: 'Búsqueda registrada, informe pendiente. La recuperación usa los resultados guardados; no repitas la búsqueda para generar el aviso.' };
    return { ok: false, error: 'La búsqueda no pudo completarse. No se reintentará ningún mensaje sin verificar su entrega.' };
  } finally {
    // Schedule CAS and lease release are separate: concurrent edits must not strand our lease.
    if (parsed.success) {
      await db.update(creatorSearchProfiles).set({
        nextRunAt: nextCreatorSearchAt({ ...parsed.data, enabled: profile.enabled }, new Date()),
      }).where(and(eq(creatorSearchProfiles.id, id), eq(creatorSearchProfiles.version, profile.version),
        eq(creatorSearchProfiles.leaseToken, leaseToken)));
    }
    await db.update(creatorSearchProfiles).set({ leaseToken: null, leaseUntil: null,
      lastRunAt: attempted ? now : profile.lastRunAt,
    }).where(and(eq(creatorSearchProfiles.id, id), eq(creatorSearchProfiles.leaseToken, leaseToken)));
  }
}

export async function runDueCreatorSearchProfiles(): Promise<Array<{ profileId: number; ok: boolean; error: string | null }>> {
  const profiles = await listDueCreatorSearchProfiles(new Date());
  const results = [];
  for (const profile of profiles) results.push({ profileId: profile.id, ...await runCreatorSearchProfile(profile.id, 'scheduled') });
  return results;
}
