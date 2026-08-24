/**
 * Endpoint de intake de #pipeline-deals.
 *
 * Lo que se comprueba aquí es sobre todo lo que NO debe pasar: procesar dos
 * veces el mismo mensaje, crear campañas, o que un mensaje roto tumbe el lote.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));

const verifyAutomationToken = jest.fn();
const findAutomationDealDraftByExternalId = jest.fn();
const createAutomationDealDraft = jest.fn();

jest.mock('@/lib/security/assertAutomationAuth', () => ({
  verifyAutomationToken: (req: Request) => verifyAutomationToken(req),
}));
jest.mock('@/lib/queries/automationDealDrafts', () => ({
  findAutomationDealDraftByExternalId: (...args: unknown[]) =>
    findAutomationDealDraftByExternalId(...args),
  createAutomationDealDraft: (...args: unknown[]) => createAutomationDealDraft(...args),
}));

import { POST } from '@/app/api/automation/discord/pipeline-deals/route';

const MENSAJE = `NUEVO DEAL

Creador: The Real Fer
Handle: @thereelfer
Marca: SkinsMonkey
Estado: aprobada
Moneda: EUR

Importe marca total: 12000
Pago creador total: 5000

Fecha de inicio: 20/08/2026
Fecha de finalización: 30/12/2026

Entregables:
- Preroll YouTube: 30`;

function req(body: unknown): Request {
  return new Request('https://x.test/api/automation/discord/pipeline-deals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function mensaje(id: string, content = MENSAJE) {
  return { messageId: id, channelId: '1533123521574862991', authorId: '1522153792592806018', content };
}

beforeEach(() => {
  jest.clearAllMocks();
  verifyAutomationToken.mockReturnValue({ ok: true });
  findAutomationDealDraftByExternalId.mockResolvedValue(null);
  createAutomationDealDraft.mockResolvedValue({
    id: 7, created: true, status: 'pending_review', missingFields: [],
  });
});

describe('auth', () => {
  it('401 sin token', async () => {
    verifyAutomationToken.mockReturnValue({ ok: false, reason: 'unauthorized' });
    const res = await POST(req({ messages: [mensaje('123456789012345678')] }));
    expect(res.status).toBe(401);
    expect(createAutomationDealDraft).not.toHaveBeenCalled();
  });

  it('503 si falta configuración', async () => {
    verifyAutomationToken.mockReturnValue({ ok: false, reason: 'missing-config' });
    const res = await POST(req({ messages: [mensaje('123456789012345678')] }));
    expect(res.status).toBe(503);
  });
});

describe('validación del cuerpo', () => {
  it('400 si el id no es un snowflake', async () => {
    const res = await POST(req({ messages: [{ ...mensaje('abc'), messageId: 'abc' }] }));
    expect(res.status).toBe(400);
  });

  it('400 si el lote viene vacío', async () => {
    const res = await POST(req({ messages: [] }));
    expect(res.status).toBe(400);
  });

  it('trunca el contenido larguísimo en vez de rechazar el trato', async () => {
    const largo = `${MENSAJE}\n${'x'.repeat(20_000)}`;
    const res = await POST(req({ messages: [mensaje('123456789012345678', largo)] }));
    expect(res.status).toBe(200);
    const rawText = createAutomationDealDraft.mock.calls[0]?.[0]?.rawText as string;
    expect(rawText.length).toBe(10_000);
  });
});

describe('idempotencia', () => {
  it('no vuelve a parsear un mensaje ya visto', async () => {
    findAutomationDealDraftByExternalId.mockResolvedValue({ id: 42, status: 'missing_info' });
    const res = await POST(req({ messages: [mensaje('123456789012345678')] }));
    const json = await res.json();
    expect(json.outcomes[0]).toMatchObject({ result: 'already_seen', draftId: 42 });
    // Lo importante: ni siquiera se intenta crear el borrador otra vez.
    expect(createAutomationDealDraft).not.toHaveBeenCalled();
  });

  it('usa discord:message:<id> como clave', async () => {
    await POST(req({ messages: [mensaje('123456789012345678')] }));
    expect(findAutomationDealDraftByExternalId).toHaveBeenCalledWith(
      'discord', 'discord:message:123456789012345678',
    );
    expect(createAutomationDealDraft.mock.calls[0]?.[0]?.externalId)
      .toBe('discord:message:123456789012345678');
  });

  it('marca already_seen si la carrera la gana otro (created=false)', async () => {
    createAutomationDealDraft.mockResolvedValue({
      id: 9, created: false, status: 'pending_review', missingFields: [],
    });
    const res = await POST(req({ messages: [mensaje('123456789012345678')] }));
    const json = await res.json();
    expect(json.outcomes[0].result).toBe('already_seen');
  });
});

describe('procesado', () => {
  it('crea el borrador con lo extraído del mensaje', async () => {
    const res = await POST(req({ messages: [mensaje('123456789012345678')] }));
    expect(res.status).toBe(200);
    const arg = createAutomationDealDraft.mock.calls[0]?.[0];
    expect(arg.source).toBe('discord');
    expect(arg.sourceChannelId).toBe('1533123521574862991');
    expect(arg.proposedDeal.name).toBe('The Real Fer x SkinsMonkey');
    expect(arg.proposedDeal.deliverables).toHaveLength(1);
  });

  it('ignora la charla del canal sin dejar borrador', async () => {
    const res = await POST(req({ messages: [mensaje('123456789012345678', 'buenas, ya subí el vídeo')] }));
    const json = await res.json();
    expect(json.outcomes[0].result).toBe('ignored');
    expect(createAutomationDealDraft).not.toHaveBeenCalled();
  });

  it('un mensaje que falla no tumba el lote', async () => {
    createAutomationDealDraft
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 8, created: true, status: 'pending_review', missingFields: [] });
    const res = await POST(req({
      messages: [mensaje('123456789012345678'), mensaje('223456789012345678')],
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.summary).toMatchObject({ received: 2, created: 1, failed: 1 });
  });

  it('devuelve los avisos del parser para quien revise', async () => {
    createAutomationDealDraft.mockResolvedValue({
      id: 3, created: true, status: 'missing_info', missingFields: ['talent.handle'],
    });
    const incompleto = MENSAJE.replace('@thereelfer', '@HANDLE_EXACTO');
    const res = await POST(req({ messages: [mensaje('123456789012345678', incompleto)] }));
    const json = await res.json();
    expect(json.outcomes[0].status).toBe('missing_info');
    expect(json.outcomes[0].warnings.join(' ')).toMatch(/handle/i);
  });

  it('resume el lote entero', async () => {
    const res = await POST(req({
      messages: [
        mensaje('123456789012345678'),
        mensaje('223456789012345678', 'hola equipo'),
      ],
    }));
    const json = await res.json();
    expect(json.summary).toEqual({ received: 2, created: 1, alreadySeen: 0, ignored: 1, failed: 0 });
  });
});
