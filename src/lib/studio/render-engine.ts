import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { env } from '@/lib/env';
import type { StudioBoard } from '@/lib/schemas/studio-production';
import { createStudioTitleCard } from './title-card';
import { renderStudioMotion } from './motion-renderer';

const runFile = promisify(execFile);
const probeSchema = z.object({ format: z.object({ duration: z.coerce.number().positive().max(3600) }),
  streams: z.array(z.object({ codec_type: z.string(), width: z.number().optional(), height: z.number().optional() })) });
export const renderDimensions = { '9:16': [720, 1280], '1:1': [720, 720], '16:9': [1280, 720] } satisfies Record<StudioBoard['format'], [number, number]>;

export async function probeStudioMedia(path: string) {
  const { stdout } = await runFile(env.STUDIO_FFPROBE_BIN, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path],
    { timeout: 20000, maxBuffer: 512000, windowsHide: true });
  const value: unknown = JSON.parse(stdout);
  const parsed = probeSchema.safeParse(value);
  if (!parsed.success) throw new Error('invalid_media');
  if (parsed.data.streams.some((s) => (s.width ?? 0) * (s.height ?? 0) > 16777216)) throw new Error('media_resolution_limit');
  return parsed.data;
}

/** Fixed command builder: file paths are generated locally, never user URLs or command fragments. */
export async function renderStudioTimeline(board: StudioBoard, files: Map<string, string>, directory: string) {
  const [width, height] = renderDimensions[board.format];
  const parts: string[] = [];
  for (const [index, scene] of board.scenes.entries()) {
    const output = join(directory, `scene-${index}.mp4`);
    const motion = scene.kind === 'title' && Boolean(scene.motion);
    const input = motion ? await renderStudioMotion(scene, board, directory, index)
      : scene.kind === 'title' ? join(directory, `card-${index}.png`) : files.get(scene.assetId ?? '');
    if (!input) throw new Error('missing_asset');
    if (scene.kind === 'title' && !motion) await writeFile(input, createStudioTitleCard(scene, board, width, height));
    let hasAudio = false;
    if (scene.kind === 'video') {
      const info = await probeStudioMedia(input);
      if (scene.start + scene.duration > info.format.duration + .05) throw new Error('trim_outside_source');
      hasAudio = info.streams.some((s) => s.codec_type === 'audio');
    }
    const duration = scene.duration.toFixed(3);
    const base = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x101016,setsar=1,fps=30`;
    // Slow typography entrance for cards; video pixels/face geometry are never generated or retouched.
    const effect = scene.kind === 'title' && !motion ? `,zoompan=z='min(1.025,1+on*0.00013)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${width}x${height}:fps=30` : '';
    const fade = `,fade=t=in:d=0.16,fade=t=out:st=${(scene.duration - .16).toFixed(3)}:d=0.16`;
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-threads', '2',
      ...(scene.kind === 'video' ? ['-ss', String(scene.start)] : motion ? [] : ['-loop', '1', '-framerate', '30']), '-i', input,
      ...(!hasAudio ? ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'] : []),
      '-t', duration, '-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0',
      '-vf', `${base}${effect}${fade}`, '-c:v', 'libx264', '-preset', 'fast', '-b:v', '900k', '-maxrate', '1200k', '-bufsize', '2400k',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-ac', '2', '-threads', '2', output];
    await runFile(env.STUDIO_FFMPEG_BIN, args, { timeout: 240000, maxBuffer: 512000, windowsHide: true });
    parts.push(output);
  }
  const concat = join(directory, 'concat.txt');
  // Only fixed scene-N filenames, not original upload names.
  await writeFile(concat, parts.map((_, i) => `file 'scene-${i}.mp4'`).join('\n'));
  const output = join(directory, 'render.mp4');
  const total = board.scenes.reduce((n, s) => n + s.duration, 0);
  const audio = board.audioAssetId ? files.get(board.audioAssetId) : null;
  if (board.audioAssetId && !audio) throw new Error('missing_audio');
  await runFile(env.STUDIO_FFMPEG_BIN, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
    '-f', 'concat', '-safe', '1', '-i', concat, ...(audio ? ['-i', audio] : []),
    '-map', '0:v:0', '-map', audio ? '1:a:0' : '0:a:0', '-c:v', 'copy',
    ...(audio ? ['-af', 'apad', '-c:a', 'aac', '-b:a', '96k'] : ['-c:a', 'copy']),
    '-t', String(total), '-movflags', '+faststart', output], { timeout: 60000, maxBuffer: 512000, windowsHide: true });
  const info = await probeStudioMedia(output);
  if (Math.abs(info.format.duration - total) > .3) throw new Error('render_duration_mismatch');
  const data = await readFile(output);
  if (data.length > 20971520) throw new Error('render_size_limit');
  return data;
}
