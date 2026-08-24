/**
 * Tests for the contact tRPC router (trpc.contact.submit).
 * Tests the mutation logic directly via a caller — no HTTP layer.
 */

jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('@/lib/email', () => ({
  sendContactEmail: jest.fn().mockResolvedValue(undefined),
  sendContactAcknowledgementEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Map()),
}));

import { appRouter } from '@/server/routers/_app';
import { db } from '@/lib/db';
import { sendContactAcknowledgementEmail, sendContactEmail } from '@/lib/email';
import { headers } from 'next/headers';

const caller = appRouter.createCaller({ session: null });
let requestCounter = 0;

describe('trpc.contact.submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestCounter += 1;
    (headers as jest.Mock).mockResolvedValue(
      new Map([['x-forwarded-for', `198.51.100.${requestCounter}`]]),
    );
  });

  it('inserts into db on valid payload', async () => {
    const result = await caller.contact.submit({
      name: 'Alice',
      email: 'alice@example.com',
      type: 'brand',
      message: 'Looking to collaborate on a campaign.',
    });
    expect(result).toEqual({ success: true });
    expect((db.insert as jest.Mock)).toHaveBeenCalledTimes(1);
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
    expect(sendContactAcknowledgementEmail).toHaveBeenCalledTimes(1);
  });

  it('throws on invalid email', async () => {
    await expect(
      caller.contact.submit({
        name: 'Alice',
        email: 'not-an-email',
        type: 'brand',
        message: 'Looking to collaborate on a campaign.',
      }),
    ).rejects.toThrow();
  });

  it('throws on short message', async () => {
    await expect(
      caller.contact.submit({
        name: 'Alice',
        email: 'alice@example.com',
        type: 'brand',
        message: 'short',
      }),
    ).rejects.toThrow();
  });

  it('still returns success if sendContactEmail throws, but flags email_pending', async () => {
    (sendContactEmail as jest.Mock).mockRejectedValueOnce(new Error('Resend down'));
    const result = await caller.contact.submit({
      name: 'Alice',
      email: 'alice@example.com',
      type: 'brand',
      message: 'Looking to collaborate on a campaign.',
    });
    // El lead ya está persistido: el UX público no se rompe. `warning` deja
    // rastro de que el aviso a marketing@ no salió (módulo leads, Fase 1).
    expect(result).toEqual({ success: true, warning: 'email_pending' });
  });

  it('omits the warning field when the email goes out', async () => {
    (sendContactEmail as jest.Mock).mockResolvedValueOnce(undefined);
    const result = await caller.contact.submit({
      name: 'Alice',
      email: 'alice@example.com',
      type: 'brand',
      message: 'Looking to collaborate on a campaign.',
    });
    expect(result).toEqual({ success: true });
    expect(result).not.toHaveProperty('warning');
  });

  it('keeps the lead saved and flags email_pending if the automatic acknowledgement fails', async () => {
    (sendContactAcknowledgementEmail as jest.Mock).mockRejectedValueOnce(new Error('Resend down'));
    const result = await caller.contact.submit({
      name: 'Alice',
      email: 'alice@example.com',
      type: 'brand',
      message: 'Looking to collaborate on a campaign.',
    });

    expect(result).toEqual({ success: true, warning: 'email_pending' });
    expect((db.insert as jest.Mock)).toHaveBeenCalledTimes(1);
  });
});
