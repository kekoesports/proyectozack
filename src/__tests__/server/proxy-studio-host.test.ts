import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

test('real proxy redirects an app CRM request before its CRM login guard', () => {
  const request = new NextRequest('https://internal:3000/admin/studio?secret=discard', { headers: { host: 'app.socialpro.es' } });
  expect(proxy(request).headers.get('location')).toBe('https://app.socialpro.es/studio');
});
test('reset links keep token on the same fixed app origin', () => {
  const request = new NextRequest('https://internal:3000/admin/reset-password?token=fixture', { headers: { host: 'app.socialpro.es' } });
  expect(proxy(request).headers.get('location')).toBe('https://app.socialpro.es/studio/reset-password?token=fixture');
});
test('app refuses CRM POST instead of forwarding credentials or mutation', () => {
  const request = new NextRequest('https://internal:3000/admin/studio', { method: 'POST', headers: { host: 'app.socialpro.es' } });
  expect(proxy(request).status).toBe(404);
});
test('Studio auth still passes through rate limiting and server auth', () => {
  const request = new NextRequest('https://internal:3000/api/auth/sign-in/email', { method: 'POST', headers: { host: 'app.socialpro.es' } });
  expect(proxy(request).headers.get('x-middleware-next')).toBe('1');
});
