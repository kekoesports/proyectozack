const mockSendResendEmail = jest.fn();
jest.mock('@/lib/email/sendResendEmail', () => ({
  sendResendEmail: mockSendResendEmail,
}));

import { sendLeadReplyEmail } from '@/lib/email/leadReply';
import { leadReplyComposerSchema, sendLeadReplySchema } from '@/lib/schemas/lead';

describe('respuesta de email desde LEADS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendResendEmail.mockResolvedValue('email_123');
  });

  it('usa pcamacho como remitente y reply-to con idempotencia', async () => {
    await sendLeadReplyEmail({
      to: 'cliente@example.test',
      subject: 'Re: Contacto',
      body: 'Hola, gracias por escribirnos.',
      idempotencyKey: 'a75307f3-846f-45ff-a728-72b59a765bb6',
    });

    expect(mockSendResendEmail).toHaveBeenCalledWith(
      'sendLeadReplyEmail',
      expect.objectContaining({
        from: 'Pablo Camacho - SocialPro <pcamacho@socialpro.es>',
        replyTo: 'pcamacho@socialpro.es',
        to: 'cliente@example.test',
      }),
      { idempotencyKey: 'a75307f3-846f-45ff-a728-72b59a765bb6' },
    );
  });

  it('escapa HTML escrito por el operador antes de componer el correo', async () => {
    await sendLeadReplyEmail({
      to: 'cliente@example.test',
      subject: 'Re: Contacto',
      body: '<script>alert(1)</script>',
      idempotencyKey: 'a75307f3-846f-45ff-a728-72b59a765bb6',
    });

    const options = mockSendResendEmail.mock.calls[0]?.[1];
    expect(options?.html).toContain('&lt;script&gt;');
    expect(options?.html).not.toContain('<script>');
  });

  it('valida asunto, cuerpo e idempotencia en el borde del servidor', () => {
    expect(leadReplyComposerSchema.safeParse({ subject: 'Re: Contacto', body: 'Hola' }).success).toBe(true);
    expect(leadReplyComposerSchema.safeParse({ subject: 'línea 1\nlínea 2', body: 'Hola' }).success).toBe(false);
    expect(sendLeadReplySchema.safeParse({
      id: 1,
      subject: 'Re: Contacto',
      body: '',
      idempotencyKey: 'no-es-uuid',
    }).success).toBe(false);
  });
});
