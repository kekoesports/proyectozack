import { StudioBoard, StudioChannelInput, StudioChatRequest, StudioObservation } from '@/lib/schemas/studio-production';
import { editorialResponse } from '@/lib/studio/editorial-assistant';
import { studioRangeStream } from '@/lib/studio/byte-range';
import { detectStudioMedia } from '@/lib/studio/media';
import { randomUUID } from 'node:crypto';

const scene = { id: randomUUID(), kind: 'title', assetId: null, title: 'Test', body: '', duration: 4, start: 0 };
const board = { version: 1, format: '9:16', palette: 'light', audioAssetId: null, scenes: [scene] };
describe('Studio production boundaries', () => {
  it('accepts declarative timelines and strips executable extras', () => {
    const parsed = StudioBoard.safeParse({ ...board, command: 'untrusted', html: '<script>bad()</script>' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).not.toHaveProperty('command');
  });
  it.each([
    { ...board, scenes: [] },
    { ...board, scenes: Array.from({ length: 9 }, () => ({ ...scene, id: randomUUID() })) },
    { ...board, scenes: [scene, scene] },
    { ...board, scenes: [{ ...scene, kind: 'video' }] },
    { ...board, scenes: [{ ...scene, duration: -2 }] },
    { ...board, scenes: [1,2,3].map(() => ({ ...scene, id: randomUUID(), duration: 60 })) },
    { ...board, format: '4:3' },
    { ...board, audioAssetId: 'https://localhost/internal' },
  ])('rejects malformed or oversized timelines', (input) => expect(StudioBoard.safeParse(input).success).toBe(false));
  it('handles are canonical, never arbitrary URLs', () => {
    expect(StudioChannelInput.safeParse({ platform: 'tiktok', handle: '@KekoEsports' })).toMatchObject({ success: true, data: { handle: 'kekoesports' } });
    expect(StudioChannelInput.safeParse({ platform: 'tiktok', handle: 'https://example.com' }).success).toBe(false);
  });
  it('the browser cannot invent a chat engine or use oversized prompts', () => {
    expect(StudioChatRequest.safeParse({ id: randomUUID(), projectId: randomUUID(), revision: 0, mode: 'expensive-custom-model', prompt: 'hello' }).success).toBe(false);
    expect(StudioChatRequest.safeParse({ id: randomUUID(), projectId: randomUUID(), revision: 0, mode: 'ai', prompt: 'x'.repeat(2001) }).success).toBe(false);
  });
  it('unknown statistics cannot be silently represented as zero', () => {
    expect(StudioObservation.safeParse({ source: 'youtube_data_api', title: 'test' }).success).toBe(false);
  });
  it('editorial rules do not masquerade as a free generative model', () => {
    const response = editorialResponse('Escribe una historia sobre mi empresa', { title: 'Test', brief: 'Test brief', script: 'Test script', cta: '', template: 'educational', platform: 'instagram' });
    expect(response.message).toContain('modo editorial');
    expect(response.script).toBeNull();
  });
  it('accepts MP3 signatures, not renamed arbitrary files', () => {
    expect(detectStudioMedia(Buffer.from('ID3' + '0'.repeat(20)))?.contentType).toBe('audio/mpeg');
    expect(detectStudioMedia(Buffer.from('not a real mp3 file at all'))).toBeNull();
  });
  it('cancelling playback during an outstanding read does not close a controller twice', async () => {
    let release: (() => void) | undefined;
    const source = new ReadableStream<Uint8Array>({ pull: () => new Promise<void>((resolve) => { release = resolve; }) });
    const reader = studioRangeStream(source, { start: 0, end: 10 }).getReader();
    const pending = reader.read();
    await Promise.resolve();
    await reader.cancel();
    release?.();
    await expect(pending).resolves.toMatchObject({ done: true });
  });
});
