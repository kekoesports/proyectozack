import { sendStudioVerificationEmail } from '@/lib/studio/verification-email';
import { sendResendEmail } from '@/lib/email/sendResendEmail';

jest.mock('@/lib/email/sendResendEmail', () => ({
  sendResendEmail: jest.fn().mockResolvedValue('synthetic-email-id'),
}));
jest.mock('@/lib/site-url', () => ({ SITE_URL: 'https://studio.test' }));
beforeEach(() => jest.clearAllMocks());

test('verification links only target the own Better Auth endpoint', async () => {
  await expect(
    sendStudioVerificationEmail(
      'fixture@studio.test',
      'https://other.test/api/auth/verify-email',
      'fixture-token',
    ),
  ).rejects.toThrow('Invalid verification destination');
  await expect(
    sendStudioVerificationEmail(
      'fixture@studio.test',
      'https://studio.test/other',
      'fixture-token',
    ),
  ).rejects.toThrow('Invalid verification destination');
  expect(sendResendEmail).not.toHaveBeenCalled();
});
test('transactional email has readable alternatives and deterministic retry key', async () => {
  const url =
    'https://studio.test/api/auth/verify-email?token=fixture&callbackURL=%2Fstudio%2Faccess';
  await sendStudioVerificationEmail(
    'fixture@studio.test',
    url,
    'fixture-token',
  );
  await sendStudioVerificationEmail(
    'fixture@studio.test',
    url,
    'fixture-token',
  );
  const calls = jest.mocked(sendResendEmail).mock.calls;
  expect(calls[0]?.[1]).toMatchObject({
    subject: 'Verifica tu correo para SocialPro Studio',
    replyTo: 'marketing@socialpro.es',
  });
  expect(calls[0]?.[1].html).toContain('lang="es" dir="ltr"');
  expect(calls[0]?.[1].html).toContain('&amp;callbackURL=');
  expect(calls[0]?.[1].text).toContain('caduca en 1 hora');
  expect(calls[0]?.[2]).toEqual(calls[1]?.[2]);
  expect(calls[0]?.[2]?.idempotencyKey).not.toContain('fixture-token');
});
