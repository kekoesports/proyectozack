/** Dedicated process, one offline render at a time. Never run FFmpeg in a Next request. */
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { and, asc, eq, lt } from 'drizzle-orm';
import { db, closeDbPool } from '../src/lib/db';
import { env } from '../src/lib/env';
import { studioRenders } from '../src/db/schema/studioProduction';
import { StudioBoard } from '../src/lib/schemas/studio-production';
import { studioJobRepository } from '../src/lib/studio/job-access';
import { getStorage } from '../src/lib/storage';
import { renderStudioTimeline } from '../src/lib/studio/render-engine';

async function once() {
  // Lost processes fail closed. No invisible automatic retries, no paid work in this worker.
  await db.update(studioRenders).set({ status: 'failed', failureCode: 'worker_interrupted', finishedAt: new Date() })
    .where(and(eq(studioRenders.status, 'rendering'), lt(studioRenders.startedAt, new Date(Date.now() - 3600000))));
  const job = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(studioRenders).where(eq(studioRenders.status, 'queued')).orderBy(asc(studioRenders.createdAt)).limit(1).for('update', { skipLocked: true });
    if (!row) return null;
    await tx.update(studioRenders).set({ status: 'rendering', startedAt: new Date() }).where(eq(studioRenders.id, row.id));
    return row;
  });
  if (!job) return false;
  const directory = await mkdtemp(join(tmpdir(), 'socialpro-render-'));
  try {
    const repository = await studioJobRepository(db, job.requestedBy, job.projectId);
    const project = await repository.project(job.projectId);
    const parsed = StudioBoard.safeParse(job.document);
    if (!project || !parsed.success) throw new Error('access_or_timeline');
    const board = parsed.data;
    const ids = [...new Set([...board.scenes.flatMap((s) => s.assetId ? [s.assetId] : []), ...(board.audioAssetId ? [board.audioAssetId] : [])])];
    const files = new Map<string, string>();
    for (const [index, id] of ids.entries()) {
      const asset = await repository.asset(id);
      if (!asset) throw new Error('asset_access');
      const stream = await getStorage().openReadStream(asset.storageKey);
      const data = Buffer.from(await new Response(stream).arrayBuffer());
      if (data.length !== asset.size || createHash('sha256').update(data).digest('hex') !== asset.checksum) throw new Error('asset_integrity');
      const path = join(directory, `asset-${index}.${asset.contentType.split('/')[1]}`);
      await writeFile(path, data); files.set(id, path);
    }
    const data = await renderStudioTimeline(board, files, directory);
    if (!await repository.project(job.projectId)) throw new Error('access_revoked');
    const file = await getStorage().upload({ filename: `SocialPro-${job.id}.mp4`, data, contentType: 'video/mp4', visibility: 'private', prefix: 'studio-renders' });
    const asset = await repository.addAsset({ projectId: project.id, name: `${project.title} · montaje ${job.boardRevision + 1}.mp4`,
      storageKey: file.storageKey, contentType: file.contentType, size: file.size, checksum: file.checksum });
    if (!asset) { await getStorage().delete(file.storageKey); throw new Error('storage_quota_or_access'); }
    await db.update(studioRenders).set({ status: 'ready', assetId: asset.id, finishedAt: new Date() }).where(and(eq(studioRenders.id, job.id), eq(studioRenders.status, 'rendering')));
    // No project approval or publication implied by completing a render.
    console.log('Studio: exportación privada terminada.');
  } catch (error: unknown) {
    const known = ['trim_outside_source', 'render_size_limit', 'asset_integrity', 'access_revoked', 'asset_access', 'access_or_timeline', 'storage_quota_or_access'];
    const failureCode = error instanceof Error && known.includes(error.message) ? error.message : 'render_failed';
    await db.update(studioRenders).set({ status: 'failed', failureCode, finishedAt: new Date() }).where(eq(studioRenders.id, job.id));
    console.error(`Studio: ${failureCode}`);
  } finally {
    // Deleting only the directory created by this invocation, never a user-supplied path.
    if (dirname(resolve(directory)) === resolve(tmpdir()) && directory.includes('socialpro-render-')) await rm(directory, { recursive: true, force: true });
  }
  return true;
}
async function main() {
  if (!env.STUDIO_ENABLED || !env.STUDIO_RENDER_ENABLED) throw new Error('Studio worker disabled');
  let running = true;
  process.once('SIGINT', () => { running = false; }); process.once('SIGTERM', () => { running = false; });
  console.log('Studio: trabajador de montaje listo. Sin generación de pago ni publicación.');
  do {
    const processed = await once();
    if (process.argv.includes('--once')) break;
    if (!processed) await new Promise<void>((done) => setTimeout(done, 5000));
  } while (running);
}
main().catch(() => { console.error('Studio worker stopped safely'); process.exitCode = 1; }).finally(closeDbPool);
