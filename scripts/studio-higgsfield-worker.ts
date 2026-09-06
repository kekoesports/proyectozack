/** Dedicated credential-bearing process. The portal never receives CLI tokens. */
import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import { db, closeDbPool } from '../src/lib/db';
import { env } from '../src/lib/env';
import { studioNarrations } from '../src/db/schema/studioNarrations';
import { createStudioRepository } from '../src/lib/studio/repository';
import { quoteHiggsfieldNarration, generateHiggsfieldNarration } from '../src/lib/studio/higgsfield-cli';
import { getStorage } from '../src/lib/storage';
import { detectStudioMedia } from '../src/lib/studio/media';

async function once() {
  await db.update(studioNarrations).set({ status: 'uncertain', failureCode: 'worker_interrupted', updatedAt: new Date() })
    .where(and(eq(studioNarrations.status, 'submitting'), lt(studioNarrations.updatedAt, new Date(Date.now() - 720000))));
  await db.update(studioNarrations).set({ status: 'failed', failureCode: 'quote_interrupted', updatedAt: new Date() })
    .where(and(eq(studioNarrations.status, 'quoting'), lt(studioNarrations.updatedAt, new Date(Date.now() - 120000))));
  const job = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(studioNarrations).where(inArray(studioNarrations.status, ['quote_requested', 'approved'])).orderBy(asc(studioNarrations.createdAt)).limit(1).for('update', { skipLocked: true });
    if (!row) return null;
    await tx.update(studioNarrations).set({ status: row.status === 'approved' ? 'submitting' : 'quoting', updatedAt: new Date() }).where(eq(studioNarrations.id, row.id));
    return row;
  });
  if (!job) return false;
  let submitted = false;
  try {
    const repository = createStudioRepository(db, job.requestedBy);
    const [project, profile] = await Promise.all([repository.project(job.projectId), repository.profile()]);
    if (!project || project.revision !== job.projectRevision || profile?.higgsfieldVoice?.id !== job.voiceId || profile.voiceStatus !== 'approved_external') throw new Error('identity_or_revision_changed');
    const creditsMilli = await quoteHiggsfieldNarration({ text: job.text, voiceId: job.voiceId });
    if (job.status !== 'approved' || !job.approvedBy || !job.quotedAt || Date.now() - job.quotedAt.getTime() > 900000 || creditsMilli !== job.creditsMilli) {
      await db.update(studioNarrations).set({ status: 'quoted', creditsMilli, quotedAt: new Date(), approvedBy: null, updatedAt: new Date() }).where(eq(studioNarrations.id, job.id));
      console.log('Studio voice: coste consultado. Esperando aprobación de agencia.');
      return true;
    }
    // Cost and identity checked again immediately before the sole external side effect.
    submitted = true;
    const output = await generateHiggsfieldNarration({ text: job.text, voiceId: job.voiceId });
    await db.update(studioNarrations).set({ providerJobId: output.id, updatedAt: new Date() }).where(eq(studioNarrations.id, job.id));
    const response = await fetch(output.url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.body) throw new Error('provider_download_failed');
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length;
      if (size > 20971520) { await reader.cancel(); throw new Error('provider_media_too_large'); } chunks.push(part.value); }
    const data = Buffer.concat(chunks);
    const media = detectStudioMedia(data);
    if (!media || !media.contentType.startsWith('audio/')) throw new Error('provider_audio_invalid');
    if (!await repository.membership()) throw new Error('access_revoked_after_generation');
    const file = await getStorage().upload({ filename: `narracion-${job.id}.${media.extension}`, data,
      contentType: media.contentType, visibility: 'private', prefix: 'studio-narrations' });
    const asset = await repository.addAsset({ projectId: job.projectId, name: `${project.title} · narración para revisar.${media.extension}`,
      contentType: file.contentType, storageKey: file.storageKey, size: file.size, checksum: file.checksum });
    if (!asset) { await getStorage().delete(file.storageKey); throw new Error('asset_save_failed'); }
    await db.update(studioNarrations).set({ status: 'complete', assetId: asset.id, updatedAt: new Date() }).where(eq(studioNarrations.id, job.id));
    console.log('Studio voice: narración privada lista para escuchar.');
  } catch {
    // Ambiguous errors after submit require reconciliation, never a second paid generation.
    await db.update(studioNarrations).set({ status: submitted ? 'uncertain' : 'failed', failureCode: submitted ? 'reconcile_provider' : 'quote_or_identity_failed', updatedAt: new Date() }).where(eq(studioNarrations.id, job.id));
    console.error('Studio voice: solicitud detenida; sin reintento automático.');
  }
  return true;
}
async function main() {
  if (!env.STUDIO_ENABLED || !env.STUDIO_HIGGSFIELD_ENABLED || !env.STUDIO_HIGGSFIELD_BIN) throw new Error('disabled');
  let running = true;
  process.once('SIGINT', () => { running = false; }); process.once('SIGTERM', () => { running = false; });
  console.log('Studio voice: trabajador listo; cotiza sin generar hasta aprobación persistida.');
  do { const done = await once(); if (process.argv.includes('--once')) break;
    if (!done) await new Promise<void>((resolve) => setTimeout(resolve, 5000));
  } while (running);
}
main().catch(() => { console.error('Studio voice: detenido'); process.exitCode = 1; }).finally(closeDbPool);
