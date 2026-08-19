const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { sendResendEmail, ResendSendError } from '@/lib/email/sendResendEmail';

const OPTIONS = {
  from: 'SocialPro <noreply@socialpro.es>',
  to: 'marketing@socialpro.es',
  subject: 'test',
  html: '<p>test</p>',
};

describe('sendResendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('lanza cuando data=null && error!=null (silent failure del SDK)', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'The socialpro.es domain is not verified' },
    });

    await expect(sendResendEmail('testCtx', OPTIONS)).rejects.toThrow(ResendSendError);
  });

  it('el mensaje del error incluye contexto y causa de Resend', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'domain is not verified' },
    });

    await expect(sendResendEmail('sendContactEmail', OPTIONS)).rejects.toThrow(
      /\[sendContactEmail\].*validation_error.*domain is not verified/,
    );
  });

  it('expone context y resendErrorName en el error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: 'rate_limit_exceeded', message: 'slow down' } });

    await expect(sendResendEmail('ctx', OPTIONS)).rejects.toMatchObject({
      context: 'ctx',
      resendErrorName: 'rate_limit_exceeded',
    });
  });

  it('lanza también si error=null pero la respuesta viene sin id', async () => {
    mockSend.mockResolvedValue({ data: null, error: null });

    await expect(sendResendEmail('ctx', OPTIONS)).rejects.toThrow(/empty_response/);
  });

  it('devuelve el id cuando el envío es correcto', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });

    await expect(sendResendEmail('ctx', OPTIONS)).resolves.toBe('email_123');
  });

  it('no loguea destinatario ni asunto (regla 10: nada de PII)', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    mockSend.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'nope' } });

    await expect(sendResendEmail('ctx', OPTIONS)).rejects.toThrow();

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain('marketing@socialpro.es');
    expect(logged).not.toContain('noreply@socialpro.es');
  });

  it('pasa las opciones tal cual al SDK', async () => {
    mockSend.mockResolvedValue({ data: { id: 'e1' }, error: null });

    await sendResendEmail('ctx', OPTIONS);

    expect(mockSend).toHaveBeenCalledWith(OPTIONS);
  });
});
