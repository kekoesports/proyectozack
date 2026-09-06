import { randomUUID } from 'node:crypto';
import { StudioBoard, StudioMotionPreviewInput } from '@/lib/schemas/studio-production';
import { studioMotionDocument } from '@/lib/studio/motion-document';
import { studioMotionSequence } from '@/lib/studio/motion-catalog';

const scene = { id: randomUUID(), kind: 'title', assetId: null, title: 'SocialPro', body: 'Uno\nDos\nTres', duration: 4, start: 0 };
const board = { version: 1, format: '9:16', palette: 'light', audioAssetId: null, scenes: [scene] };
describe('SocialPro motion boundaries', () => {
  it('preserves legacy designs when motion was not chosen', () => {
    const parsed = StudioBoard.safeParse(board);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.scenes[0]).not.toHaveProperty('motion');
  });
  it.each(['statement-v1', 'steps-v1', 'contact-v1'])('accepts immutable design %s', (motion) => {
    expect(StudioBoard.safeParse({ ...board, scenes: [{ ...scene, motion }] }).success).toBe(true);
  });
  it.each([
    { motion: 'https://malicious.test/remote.html' }, { motion: '../file' }, { motion: 'statement-v2' },
    { motion: 'steps-v1', body: '1\n2\n3\n4' }, { motion: 'statement-v1', duration: 1 },
    { motion: 'statement-v1', kind: 'video', assetId: randomUUID() },
  ])('rejects unsupported or unreadable animation inputs', (extra) => {
    expect(StudioBoard.safeParse({ ...board, scenes: [{ ...scene, ...extra }] }).success).toBe(false);
  });
  it('escapes hostile text and does not allow network access', () => {
    const parsed = StudioBoard.safeParse({ ...board, scenes: [{ ...scene, motion: 'statement-v1', title: '</h1><script>alert(1)</script>', body: '<img src=x onerror=alert(2)>' }] });
    expect(parsed.success).toBe(true);
    if (!parsed.success || !parsed.data.scenes[0]) return;
    const html = studioMotionDocument(parsed.data.scenes[0], parsed.data, { display: 'display.ttf', body: 'body.ttf' });
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toContain('requestAnimationFrame'); // renderer is driven only by frame seeks
  });
  it.each(['founder', 'creator', 'campaign'] as const)('creates safe %s sequences with fresh IDs', (id) => {
    const first = studioMotionSequence(id);
    expect(StudioBoard.safeParse({ ...board, scenes: first }).success).toBe(true);
    expect(first).toHaveLength(3);
    expect(first.every((item) => item.kind === 'title' && item.assetId === null)).toBe(true);
    const second = studioMotionSequence(id);
    expect(first.every((item) => second.every((next) => next.id !== item.id))).toBe(true);
  });
  it('preview requires a project key; it cannot be an arbitrary remote URL', () => {
    expect(StudioMotionPreviewInput.safeParse({ scene, format: '9:16', palette: 'light' }).success).toBe(false);
  });
});
