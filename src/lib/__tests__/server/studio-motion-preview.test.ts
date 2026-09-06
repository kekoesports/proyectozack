import { randomUUID } from 'node:crypto';
import { previewStudioMotion, previewStudioTemplate } from '@/app/studio/motion-actions';

const mockProject = jest.fn();
const mockAuth = jest.fn();
const mockFonts = jest.fn();
jest.mock('@/lib/studio/access', () => ({ requireCreator: () => mockAuth() }));
jest.mock('@/lib/studio/motion-preview', () => ({ studioPreviewFonts: () => mockFonts() }));
const input = { projectId: randomUUID(), format: '9:16', palette: 'dark', scene: {
  id: randomUUID(), kind: 'title', assetId: null, title: 'SocialPro', body: 'Una idea', duration: 3, start: 0, motion: 'statement-v1',
} };
beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ repository: { project: mockProject } });
  mockProject.mockResolvedValue({ id: input.projectId });
  mockFonts.mockResolvedValue({ display: 'display.ttf', body: 'body.ttf', logo: 'socialpro.png' });
});
test('preview rejects missing authentication before reading fonts or projects', async () => {
  mockAuth.mockRejectedValue(new Error('AUTH_REQUIRED'));
  await expect(previewStudioMotion(input)).rejects.toThrow('AUTH_REQUIRED');
  expect(mockProject).not.toHaveBeenCalled(); expect(mockFonts).not.toHaveBeenCalled();
});
test('another creator project is not available to preview', async () => {
  mockProject.mockResolvedValue(null);
  expect(await previewStudioMotion(input)).toMatchObject({ ok: false });
  expect(mockFonts).not.toHaveBeenCalled();
});
test('invalid design is rejected before any project query', async () => {
  expect(await previewStudioMotion({ ...input, scene: { ...input.scene, motion: 'remote-url' } })).toMatchObject({ ok: false });
  expect(mockProject).not.toHaveBeenCalled();
});
test('owned preview renders escaped text inside the fixed offline composition', async () => {
  const result = await previewStudioMotion({ ...input, scene: { ...input.scene, title: '<script>untrusted()</script>' } });
  expect(result.ok).toBe(true);
  if (result.ok) { expect(result.html).toContain('&lt;script&gt;'); expect(result.html).toContain("connect-src 'none'"); }
  expect(mockProject).toHaveBeenCalledWith(input.projectId);
});
test('catalog preview requires auth, validates IDs and never queries private projects', async () => {
  mockAuth.mockRejectedValueOnce(new Error('AUTH_REQUIRED'));
  await expect(previewStudioTemplate({ motion: 'quiz-v1', format: '9:16', palette: 'dark' })).rejects.toThrow('AUTH_REQUIRED');
  expect(mockFonts).not.toHaveBeenCalled();
  expect(await previewStudioTemplate({ motion: 'remote-url', format: '9:16', palette: 'dark' })).toMatchObject({ ok: false });
  expect(await previewStudioTemplate({ motion: 'quiz-v1', format: '9:16', palette: 'dark' })).toMatchObject({ ok: true });
  expect(mockProject).not.toHaveBeenCalled();
});
