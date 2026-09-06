import { studioHostRoute } from '@/lib/studio/host-routing';

test.each(['/', '/admin', '/admin/studio', '/admin/talents/1', '/admin/report.json', '/talentos', '/login-other'])('app %s leads to Studio, never CRM', (path) => {
  expect(studioHostRoute('app.socialpro.es', path, 'GET')).toEqual({ kind: 'redirect', path: '/studio', preserveSearch: false });
});
test.each(['/studio', '/studio/projects/123', '/studio/workspaces', '/api/studio/assets', '/api/auth/sign-in/email', '/api/health/live', '/images/talent.webp', '/_next/static/chunk.js'])('app serves its own dependency %s', (path) => {
  expect(studioHostRoute('app.socialpro.es', path, 'GET')).toEqual({ kind: 'pass' });
});
test.each(['/api/admin/export.json', '/api/trpc/private', '/api/contact', '/api/studio-evil'])('unrelated API %s is not exposed on app', (path) => {
  expect(studioHostRoute('app.socialpro.es', path, 'GET')).toEqual({ kind: 'reject' });
});
test.each(['POST', 'PUT', 'DELETE', 'PATCH'])('never replays a CRM %s mutation through a redirect', (method) => {
  expect(studioHostRoute('app.socialpro.es', '/admin/studio', method)).toEqual({ kind: 'reject' });
});
test.each(['login', 'two-factor', 'forgot-password', 'reset-password'])('old %s links stay on Studio, preserving recovery query', (route) => {
  expect(studioHostRoute('app.socialpro.es', `/admin/${route}`, 'GET')).toEqual({ kind: 'redirect', path: `/studio/${route}`, preserveSearch: true });
});
test.each(['socialpro.es', 'localhost:3106', 'kekopilot.socialpro.es', 'app.socialpro.es.attacker.test', 'app.socialpro.es@evil.test', null])('does not alter host %s or trust a lookalike', (host) => {
  expect(studioHostRoute(host, '/admin/studio', 'GET')).toEqual({ kind: 'pass' });
});
test('HTTPS host normalization is exact', () => {
  expect(studioHostRoute('APP.SOCIALPRO.ES:443', '/', 'HEAD').kind).toBe('redirect');
});
