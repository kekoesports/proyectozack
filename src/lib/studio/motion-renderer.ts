import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { StudioBoard, StudioScene } from '@/lib/schemas/studio-production';
import { studioMotionDocument } from './motion-document';
import { env } from '@/lib/env';

const runFile = promisify(execFile);
/** Our HTML, local fonts and fixed CLI arguments. No provider calls or uploaded HTML. */
export async function renderStudioMotion(scene: StudioScene, board: StudioBoard, directory: string, index: number) {
  const project = join(directory, `motion-${index}`);
  await mkdir(project);
  await Promise.all([
    copyFile(resolve('public/fonts/studio/BarlowCondensed-ExtraBold.ttf'), join(project, 'display.ttf')),
    copyFile(resolve('public/fonts/studio/Inter.ttf'), join(project, 'body.ttf')),
  ]);
  await writeFile(join(project, 'index.html'), studioMotionDocument(scene, board, { display: 'display.ttf', body: 'body.ttf' }));
  const output = join(project, 'motion.mp4');
  await runFile(process.execPath, [resolve('node_modules/hyperframes/bin/hyperframes.mjs'), 'render', project,
    '--output', output, '--fps', '30', '--workers', '1', '--quality', 'standard', '--no-browser-gpu', '--frames-cache-dir', 'off'],
  { timeout: 240000, maxBuffer: 1024000, windowsHide: true, env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1',
    ...(env.STUDIO_FFMPEG_BIN !== 'ffmpeg' ? { HYPERFRAMES_FFMPEG_PATH: env.STUDIO_FFMPEG_BIN } : {}),
    ...(env.STUDIO_FFPROBE_BIN !== 'ffprobe' ? { HYPERFRAMES_FFPROBE_PATH: env.STUDIO_FFPROBE_BIN } : {}),
  } });
  return output;
}
