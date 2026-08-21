/**
 * Autenticación de la ingestión de telemetría.
 *
 * Un endpoint que recibe señales de fuera y las guarda para que un modelo las
 * lea es exactamente la superficie que hay que blindar. Se prueba lo que
 * separa "una alerta legítima" de "cualquiera escribiendo en el contexto de
 * Guardian": bearer, firma sobre el cuerpo, y ventana de replay.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

let MOCK_TOKEN: string | undefined = 't'.repeat(40);
let MOCK_SECRET: string | undefined = 's'.repeat(40);
jest.mock('@/lib/env', () => ({
  env: {
    get AGENT_INTERNAL_TOKEN() {
      return MOCK_TOKEN;
    },
    get AGENT_EVENT_HMAC_SECRET() {
      return MOCK_SECRET;
    },
  },
}));

import {
  REPLAY_WINDOW_SECONDS,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  computeEventSignature,
  statusForAuthReason,
  verifyAgentEventRequest,
  verifyAgentInternalToken,
} from '@/lib/security/assertAgentInternalAuth';

const AHORA = new Date('2026-08-21T10:00:00.000Z');
const CUERPO = '{"source":"collector","eventType":"system.disk"}';

function peticion(opts: {
  readonly token?: string | null;
  readonly timestamp?: string;
  readonly firma?: string;
} = {}): Request {
  const headers = new Headers();
  if (opts.token !== null) headers.set('authorization', `Bearer ${opts.token ?? MOCK_TOKEN}`);
  if (opts.timestamp !== undefined) headers.set(TIMESTAMP_HEADER, opts.timestamp);
  if (opts.firma !== undefined) headers.set(SIGNATURE_HEADER, opts.firma);
  return new Request('https://ejemplo.test/api/internal/agents/events', { method: 'POST', headers });
}

function firmaValida(ts: string, cuerpo = CUERPO): string {
  return computeEventSignature(MOCK_SECRET ?? '', ts, cuerpo);
}

const TS_VALIDO = String(Math.floor(AHORA.getTime() / 1000));

beforeEach(() => {
  MOCK_TOKEN = 't'.repeat(40);
  MOCK_SECRET = 's'.repeat(40);
});

describe('bearer', () => {
  it('acepta el token correcto', () => {
    expect(verifyAgentInternalToken(peticion())).toEqual({ ok: true });
  });

  it('rechaza un token distinto', () => {
    expect(verifyAgentInternalToken(peticion({ token: 'x'.repeat(40) }))).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
  });

  it('rechaza si no hay cabecera', () => {
    expect(verifyAgentInternalToken(peticion({ token: null }))).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
  });

  it('sin token configurado falla en cerrado, no abre', () => {
    // 503 y no 200: no está roto, falta configurarlo, y hasta entonces no entra
    // nada.
    MOCK_TOKEN = undefined;
    expect(verifyAgentInternalToken(peticion())).toEqual({ ok: false, reason: 'missing-config' });
  });

  it('missing-config es 503 y el resto 401', () => {
    expect(statusForAuthReason('missing-config')).toBe(503);
    expect(statusForAuthReason('unauthorized')).toBe(401);
    expect(statusForAuthReason('bad-signature')).toBe(401);
    expect(statusForAuthReason('stale-timestamp')).toBe(401);
  });
});

describe('firma del cuerpo', () => {
  it('acepta una petición bien firmada', () => {
    const req = peticion({ timestamp: TS_VALIDO, firma: firmaValida(TS_VALIDO) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: true });
  });

  it('rechaza si el cuerpo cambió tras firmarlo', () => {
    const req = peticion({ timestamp: TS_VALIDO, firma: firmaValida(TS_VALIDO) });
    const manipulado = CUERPO.replace('system.disk', 'system.service');
    expect(verifyAgentEventRequest(req, manipulado, AHORA)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('rechaza una firma inventada', () => {
    const req = peticion({ timestamp: TS_VALIDO, firma: 'a'.repeat(64) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('rechaza si falta la firma o la marca de tiempo', () => {
    expect(verifyAgentEventRequest(peticion({ timestamp: TS_VALIDO }), CUERPO, AHORA)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
    expect(verifyAgentEventRequest(peticion({ firma: firmaValida(TS_VALIDO) }), CUERPO, AHORA)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('la marca de tiempo entra en lo firmado', () => {
    // Si no, se podría reutilizar una firma válida cambiando solo la cabecera de
    // fecha, y la ventana de replay no protegería de nada.
    const otroTs = String(Number(TS_VALIDO) + 1);
    const req = peticion({ timestamp: otroTs, firma: firmaValida(TS_VALIDO) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('el bearer se comprueba antes que el HMAC', () => {
    // Calcular una firma por cada petición sin credencial sería trabajo
    // regalado a quien las envíe.
    const req = peticion({ token: 'x'.repeat(40), timestamp: TS_VALIDO, firma: firmaValida(TS_VALIDO) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('sin secreto HMAC falla en cerrado', () => {
    MOCK_SECRET = undefined;
    const req = peticion({ timestamp: TS_VALIDO, firma: 'a'.repeat(64) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'missing-config' });
  });
});

describe('ventana de replay', () => {
  it('acepta dentro de la ventana', () => {
    const ts = String(Math.floor(AHORA.getTime() / 1000) - (REPLAY_WINDOW_SECONDS - 10));
    const req = peticion({ timestamp: ts, firma: firmaValida(ts) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: true });
  });

  it('rechaza una petición vieja reenviada', () => {
    // Es el ataque que el bearer solo no para: quien lo saque de un log podría
    // repetir la misma alerta mil veces.
    const ts = String(Math.floor(AHORA.getTime() / 1000) - (REPLAY_WINDOW_SECONDS + 60));
    const req = peticion({ timestamp: ts, firma: firmaValida(ts) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'stale-timestamp' });
  });

  it('rechaza también una del futuro', () => {
    // Un reloj mal puesto, o un intento de alargar la validez de una firma.
    const ts = String(Math.floor(AHORA.getTime() / 1000) + (REPLAY_WINDOW_SECONDS + 60));
    const req = peticion({ timestamp: ts, firma: firmaValida(ts) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'stale-timestamp' });
  });

  it('rechaza una marca de tiempo que no es un número', () => {
    const req = peticion({ timestamp: 'ayer', firma: 'a'.repeat(64) });
    expect(verifyAgentEventRequest(req, CUERPO, AHORA)).toEqual({ ok: false, reason: 'stale-timestamp' });
  });

  it('la ventana es corta: cubre desfase de reloj, no una tarde entera', () => {
    expect(REPLAY_WINDOW_SECONDS).toBeLessThanOrEqual(600);
  });
});
