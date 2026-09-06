import { detectStudioMedia } from '@/lib/studio/media';
import {
  StudioProjectInput,
  StudioReview,
  StudioAssetInput,
  StudioToken,
  StudioLogin,
  StudioSignup,
} from '@/lib/schemas/studio';
import { homeForRole } from '@/lib/home-for-role';

test('existing credentials can sign in without weakening new-account password policy', () => {
  const existing = { email: 'fixture@studio.test', password: 'Old-pass1!', name: '' };
  expect(StudioLogin.safeParse(existing).success).toBe(true);
  expect(StudioLogin.safeParse({ ...existing, password: '' }).success).toBe(false);
  expect(StudioSignup.safeParse({ ...existing, name: 'Fixture' }).success).toBe(false);
  expect(StudioSignup.safeParse({ ...existing, name: 'Fixture', password: 'New-fixture-pass-2026!' }).success).toBe(true);
});

test.each([
  '<svg onload="alert(1)"></svg>',
  '<html>not a png</html>',
  'executable-content',
])('rejects executable or unsupported file content: %s', (value) => {
  expect(detectStudioMedia(Buffer.from(value))).toBeNull();
});
test('rejects truncated data', () => {
  expect(detectStudioMedia(Buffer.from([137, 80, 78, 71]))).toBeNull();
});
test('detects PNG from signature without trusting filename', () => {
  expect(
    detectStudioMedia(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
    ),
  ).toEqual({ contentType: 'image/png', extension: 'png' });
});
test('distinguishes WAV, WebP and unsupported RIFF files', () => {
  expect(
    detectStudioMedia(Buffer.from('RIFF0000WAVEfixture'))?.contentType,
  ).toBe('audio/wav');
  expect(
    detectStudioMedia(Buffer.from('RIFF0000WEBPfixture'))?.contentType,
  ).toBe('image/webp');
  expect(detectStudioMedia(Buffer.from('RIFF0000AVI fixture'))).toBeNull();
});
test('requires explicit rights and a real project UUID', () => {
  expect(
    StudioAssetInput.safeParse({
      name: 'fixture.png',
      projectId: null,
      rightsConfirmed: false,
    }).success,
  ).toBe(false);
  expect(
    StudioAssetInput.safeParse({
      name: 'fixture.png',
      projectId: '123',
      rightsConfirmed: true,
    }).success,
  ).toBe(false);
});
test('cannot post a review for a negative revision or an unknown decision', () => {
  const id = 'b750c00b-e850-4fc4-9f96-e0570a500c54';
  expect(
    StudioReview.safeParse({
      id,
      revision: -1,
      decision: 'approved',
      comment: 'Fixture',
    }).success,
  ).toBe(false);
  expect(
    StudioReview.safeParse({
      id,
      revision: 0,
      decision: 'published',
      comment: 'Fixture',
    }).success,
  ).toBe(false);
});
test('client-supplied ownership and status are not accepted as writable project fields', () => {
  const result = StudioProjectInput.safeParse({
    title: 'Fixture',
    template: 'educational',
    platform: 'tiktok',
    brief: 'Synthetic fixture',
    script: '',
    cta: '',
    talentId: 123,
    status: 'approved',
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).not.toHaveProperty('talentId');
    expect(result.data).not.toHaveProperty('status');
  }
});
test('tokens require the full random secret and creator home is not CRM', () => {
  expect(StudioToken.safeParse('short').success).toBe(false);
  expect(StudioToken.safeParse('g'.repeat(64)).success).toBe(false);
  expect(homeForRole('creator')).toBe('/studio');
});
