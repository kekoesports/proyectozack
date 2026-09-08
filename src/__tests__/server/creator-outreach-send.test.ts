const mockSend = jest.fn();
const mockRecipient = jest.fn();
const mockSuppressed = jest.fn();
const mockReserve = jest.fn();
const mockComplete = jest.fn();
const mockFail = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/env', () => ({ env: {
  CREATOR_REPLY_RECEIVING_DOMAIN: 'reply.socialpro.es',
  NEXT_PUBLIC_SITE_URL: 'https://socialpro.es',
} }));
jest.mock('@/lib/constants/operational-email', () => ({ OPERATIONAL_EMAIL_FROM: 'SocialPro <crm@socialpro.es>' }));
jest.mock('@/lib/email/sendResendEmail', () => ({
  sendResendEmail: (...args: unknown[]) => mockSend(...args),
}));
jest.mock('@/lib/queries/creatorOutreach', () => ({
  completeCreatorOutreach: (...args: unknown[]) => mockComplete(...args),
  failCreatorOutreach: (...args: unknown[]) => mockFail(...args),
  getCreatorOutreachRecipient: (...args: unknown[]) => mockRecipient(...args),
  isCreatorEmailSuppressed: (...args: unknown[]) => mockSuppressed(...args),
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  reserveCreatorOutreach: (...args: unknown[]) => mockReserve(...args),
}));

import { CreatorOutreachError, sendCreatorOutreach } from '@/lib/email/creatorOutreach';

const input = {
  sourceType: 'target' as const,
  sourceId: 42,
  subject: 'Propuesta SocialPro',
  body: 'Hola, esta es una prueba controlada.',
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
};

describe('creator outreach sender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecipient.mockResolvedValue({ email: 'Creator@Example.com', name: 'Creator' });
    mockSuppressed.mockResolvedValue(false);
    mockReserve.mockResolvedValue({
      threadId: 7,
      messageId: 9,
      replyToken: '22222222-2222-4222-8222-222222222222',
      unsubscribeToken: '33333333-3333-4333-8333-333333333333',
      providerEmailId: null,
      subject: input.subject,
      body: input.body,
    });
    mockSend.mockResolvedValue('email_synthetic_1');
  });

  it('sends with tracked reply-to and records provider acceptance', async () => {
    await expect(sendCreatorOutreach(input, 'staff_1')).resolves.toEqual({
      providerEmailId: 'email_synthetic_1', duplicate: false, replyTracking: true,
    });
    expect(mockSend).toHaveBeenCalledWith('sendCreatorOutreach', expect.objectContaining({
      to: 'creator@example.com',
      replyTo: 'creator-22222222-2222-4222-8222-222222222222@reply.socialpro.es',
      headers: expect.objectContaining({ 'List-Unsubscribe': expect.stringContaining('33333333') }),
    }), { idempotencyKey: input.idempotencyKey });
    expect(mockComplete).toHaveBeenCalledWith({ threadId: 7, messageId: 9, providerEmailId: 'email_synthetic_1' });
  });

  it('does not call the provider again when the same operation was completed', async () => {
    mockReserve.mockResolvedValueOnce({
      threadId: 7, messageId: 9,
      replyToken: '22222222-2222-4222-8222-222222222222',
      unsubscribeToken: '33333333-3333-4333-8333-333333333333',
      providerEmailId: 'email_synthetic_1',
      subject: input.subject,
      body: input.body,
    });
    await expect(sendCreatorOutreach(input, 'staff_1')).resolves.toEqual({ providerEmailId: 'email_synthetic_1', duplicate: true, replyTracking: true });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('blocks suppressed recipients before reserving or sending', async () => {
    mockSuppressed.mockResolvedValueOnce(true);
    await expect(sendCreatorOutreach(input, 'staff_1')).rejects.toEqual(expect.objectContaining<Partial<CreatorOutreachError>>({ code: 'suppressed' }));
    expect(mockReserve).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
