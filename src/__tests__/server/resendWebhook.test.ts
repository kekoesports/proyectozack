import { resendEmailWebhookEventSchema } from '@/lib/schemas/resend-webhook';
import { suppressionReasonForEvent } from '@/lib/email/resendWebhook';

function event(type: string, bounceType?: string): unknown {
  return {
    type,
    created_at: '2026-09-07T09:00:00.000Z',
    data: {
      email_id: 'email_test_123',
      to: ['recipient@example.com'],
      ...(bounceType ? { bounce: { type: bounceType, subType: 'General' } } : {}),
    },
  };
}

describe('Resend webhook boundary', () => {
  it('accepts supported signed-payload shapes and ignores extra provider fields', () => {
    const parsed = resendEmailWebhookEventSchema.safeParse({
      ...event('email.delivered') as Record<string, unknown>,
      provider_extension: true,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects recipients that are not valid email addresses', () => {
    const payload = event('email.delivered') as {
      data: { to: string[] };
    };
    payload.data.to = ['not-an-email'];

    expect(resendEmailWebhookEventSchema.safeParse(payload).success).toBe(false);
  });

  it.each([
    ['email.complained', undefined, 'complaint'],
    ['email.suppressed', undefined, 'provider_suppressed'],
    ['email.bounced', 'Permanent', 'permanent_bounce'],
    ['email.bounced', 'Transient', null],
    ['email.delivered', undefined, null],
  ] as const)('maps %s (%s) to %s', (type, bounceType, expected) => {
    const parsed = resendEmailWebhookEventSchema.parse(event(type, bounceType));
    expect(suppressionReasonForEvent(parsed)).toBe(expected);
  });
});
