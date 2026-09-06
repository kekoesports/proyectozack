/** Reproducible offline examples: no DB, credentials, provider, speech or personal media. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { StudioBoard } from '../src/lib/schemas/studio-production';
import { STUDIO_MOTION_EXAMPLES, studioExampleBoard } from '../src/lib/studio/motion-examples';
import { renderStudioTimeline, probeStudioMedia } from '../src/lib/studio/render-engine';

async function main() {
  const output = resolve('public/motion/collection-02');
  await mkdir(output, { recursive: true });
  await mkdir(resolve('.scratch'), { recursive: true });
  const root = await mkdtemp(resolve('.scratch/studio-collection-'));
  for (const example of STUDIO_MOTION_EXAMPLES) {
    const parsed = StudioBoard.safeParse(studioExampleBoard(example.id));
    assert(parsed.success, `Invalid example: ${example.id}`);
    const directory = join(root, example.id);
    await mkdir(directory);
    await renderStudioTimeline(parsed.data, new Map(), directory);
    const file = join(directory, 'render.mp4');
    const info = await probeStudioMedia(file);
    assert(Math.abs(info.format.duration - example.designs.length * 5) < .3);
    assert(info.streams.some((s) => s.codec_type === 'video' && s.width === 720 && s.height === 1280));
    await copyFile(file, join(output, `${example.id}.mp4`));
    console.log(`PASS ${example.id}: ${info.format.duration}s, 720x1280, 0 provider calls`);
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'examples_failed'); process.exitCode = 1; });
