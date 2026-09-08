const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { persistResendWebhookEvent } from '@/lib/email/resendWebhook';
import { resendEmailWebhookEventSchema } from '@/lib/schemas/resend-webhook';

type InsertResult = ReadonlyArray<{ readonly id: number }>;

function fakeTransaction(results: InsertResult[]) {
  const insert = jest.fn(() => ({
    values: jest.fn(() => ({
      onConflictDoNothing: jest.fn(() => ({
        returning: jest.fn(async () => results.shift() ?? []),
      })),
    })),
  }));

  const update = jest.fn(() => ({
    set: jest.fn(() => ({
      where: jest.fn(() => ({ returning: jest.fn(async () => []) })),
    })),
  }));

  return { insert, update };
}

describe('Resend webhook persistence', () => {
  beforeEach(() => mockTransaction.mockReset());

  it('persists a suppression once and acknowledges a duplicate without repeating effects', async () => {
    const tx = fakeTransaction([[{ id: 1 }], [{ id: 2 }], []]);
    mockTransaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );
    const event = resendEmailWebhookEventSchema.parse({
      type: 'email.complained',
      created_at: '2026-09-07T09:00:00.000Z',
      data: { email_id: 'email_123', to: ['Person@Example.com'] },
    });

    await expect(persistResendWebhookEvent('svix_123', event)).resolves.toEqual({
      duplicate: false,
      suppressed: 1,
    });
    await expect(persistResendWebhookEvent('svix_123', event)).resolves.toEqual({
      duplicate: true,
      suppressed: 0,
    });

    // Primer evento + primera supresión + segundo intento de evento.
    expect(tx.insert).toHaveBeenCalledTimes(3);
  });
});
