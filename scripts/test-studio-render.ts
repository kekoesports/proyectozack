/** Offline native renderer smoke test: synthetic material only, no database or provider calls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { StudioBoard } from '../src/lib/schemas/studio-production';
import { renderStudioTimeline, renderDimensions, probeStudioMedia } from '../src/lib/studio/render-engine';
import { createStudioTitleCard, wrapStudioText } from '../src/lib/studio/title-card';

async function main() {
  await mkdir(resolve('.scratch'), { recursive: true });
  const root = await mkdtemp(resolve('.scratch/studio-render-check-'));
  const words = 'SocialPro'.repeat(30);
  const lines = wrapStudioText(words, 50, (value) => value.length * 10);
  assert.equal(lines.join(''), words);
  assert(lines.every((line) => line.length <= 5));
  for (const format of ['9:16', '1:1', '16:9'] as const) {
    const parsed = StudioBoard.safeParse({ version: 1, format, palette: 'light', audioAssetId: null,
      scenes: [{ id: randomUUID(), kind: 'title', assetId: null, start: 0, duration: 2,
        title: 'Las personas, el contenido y una forma de trabajar: cada colaboración necesita sentido.',
        body: 'Esta cartela verifica el encaje del texto completo en los tres formatos. La audiencia, el contenido y el contexto importan. Un diseño debe respetar sus márgenes, conservar la lectura y mostrar cada palabra sin recortes ni solapamientos.' }] });
    assert(parsed.success, 'Synthetic timeline must validate');
    const board = parsed.data;
    const directory = join(root, format.replace(':', '-'));
    await mkdir(directory);
    const [width, height] = renderDimensions[format];
    assert(board.scenes[0]);
    await writeFile(join(directory, 'preview.png'), createStudioTitleCard(board.scenes[0], board, width, height));
    const data = await renderStudioTimeline(board, new Map(), directory);
    assert(data.length > 1000 && data.length <= 20971520);
    const info = await probeStudioMedia(join(directory, 'render.mp4'));
    const video = info.streams.find((stream) => stream.codec_type === 'video');
    assert.equal(video?.width, width); assert.equal(video?.height, height);
    assert(Math.abs(info.format.duration - 2) < .3);
    console.log(`PASS ${format}: native MP4, dimensions, duration, bounded size`);
  }
  console.log(`Synthetic previews retained for visual inspection: ${root}`);
}
main().catch(() => { console.error('Studio renderer smoke test failed'); process.exitCode = 1; });
