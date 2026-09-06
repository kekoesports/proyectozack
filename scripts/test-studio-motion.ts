/** Offline test: fixed synthetic text, no account, media upload or paid generation. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { StudioBoard } from '../src/lib/schemas/studio-production';
import { renderStudioTimeline, probeStudioMedia } from '../src/lib/studio/render-engine';
import { STUDIO_MOTION_DESIGNS } from '../src/lib/studio/motion-catalog';

async function main() {
  await mkdir(resolve('.scratch'), { recursive: true });
  const root = await mkdtemp(resolve('.scratch/studio-motion-check-'));
  console.log(`Motion test directory: ${root}`);
  for (const [index, format] of (['9:16', '1:1', '16:9'] as const).entries()) {
    const design = STUDIO_MOTION_DESIGNS[index];
    assert(design);
    const parsed = StudioBoard.safeParse({ version: 1, format, palette: index === 1 ? 'light' : 'dark', audioAssetId: null,
      scenes: [{ id: randomUUID(), kind: 'title', assetId: null, start: 0, duration: 3, motion: design.id, title: design.title, body: design.body }] });
    assert(parsed.success);
    const directory = join(root, format.replace(':', '-'));
    await mkdir(directory);
    await renderStudioTimeline(parsed.data, new Map(), directory);
    const info = await probeStudioMedia(join(directory, 'render.mp4'));
    assert(Math.abs(info.format.duration - 3) < .3);
    console.log(`PASS native HyperFrames + FFmpeg ${format} / ${design.id}`);
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'motion_test_failed'); process.exitCode = 1; });
