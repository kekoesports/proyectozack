import { POST } from '@/app/api/studio/assets/route';

const mockAuth = jest.fn();
jest.mock('@/lib/studio/access', () => ({ requireCreator: () => mockAuth() }));
jest.mock('@/lib/site-url', () => ({ SITE_URL: 'https://socialpro.es' }));
jest.mock('@/lib/storage', () => ({ uploadFile: jest.fn(), deleteFile: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ repository: {} });
});

test.each(['https://socialpro.es', 'https://app.socialpro.es'])('public origin %s passes behind a reverse proxy with an internal Next URL', async (origin) => {
  const request = new Request('http://0.0.0.0:3000/api/studio/assets', {
    method: 'POST', headers: { origin },
  });
  // Missing body, not forbidden: origin was accepted without trusting Host.
  expect((await POST(request)).status).toBe(400);
});

test.each([
  'https://attacker.test', 'null', 'https://socialpro.es/unsafe', 'http://socialpro.es',
  'http://app.socialpro.es', 'https://app.socialpro.es.evil.test',
  'https://app.socialpro.es/', 'https://app.socialpro.es:444', 'https://n8n.socialpro.es',
])('rejects untrusted origin %s', async (origin) => {
  const request = new Request('http://0.0.0.0:3000/api/studio/assets', {
    method: 'POST', headers: { origin, 'x-forwarded-host': 'socialpro.es' },
  });
  expect((await POST(request)).status).toBe(403);
});

test('rejects absent origin and still requires creator authentication first', async () => {
  const request = new Request('http://0.0.0.0:3000/api/studio/assets', { method: 'POST' });
  expect((await POST(request)).status).toBe(403);
  mockAuth.mockRejectedValue(new Error('AUTH_REQUIRED'));
  await expect(POST(request)).rejects.toThrow('AUTH_REQUIRED');
});
