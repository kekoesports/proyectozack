import { Resend, type CreateEmailOptions } from 'resend';

import { env } from '@/lib/env';

/**
 * Cliente Resend compartido. Vive aquí (y no en `lib/email.ts`) para que
 * cualquier emisor de email use la misma instancia y el mismo manejo de
 * errores.
 */
export const resend = new Resend(env.RESEND_API_KEY);

/** Error de envío ya normalizado — el `context` identifica al emisor. */
export class ResendSendError extends Error {
  readonly context: string;
  readonly resendErrorName: string;

  constructor(context: string, resendErrorName: string, detail: string) {
    super(`[${context}] Resend rechazó el envío: ${resendErrorName} — ${detail}`);
    this.name = 'ResendSendError';
    this.context = context;
    this.resendErrorName = resendErrorName;
  }
}

/**
 * Envuelve `resend.emails.send()` y **lanza** si el API devuelve error.
 *
 * El SDK de Resend v3+ no hace throw: devuelve `{ data, error }` y deja
 * `data` a null cuando falla (dominio sin verificar, API key inválida,
 * rate limit…). Sin este check, un envío fallido es indistinguible de uno
 * correcto y el emisor marca "éxito" en silencio — ver el incidente del
 * dominio socialpro.es sin verificar y la deuda de los 7 call-sites.
 *
 * Modelo: `sendPasswordResetEmail` tras el fix del PR #281.
 *
 * No loguea destinatarios ni asunto: sería PII (regla 10 de
 * `.claude/rules/typescript.md`). Sólo id de email y contexto.
 *
 * @param context identificador del emisor, p.ej. 'sendContactEmail'
 * @returns el id del email aceptado por Resend
 * @throws {ResendSendError} si Resend devuelve error, o una respuesta sin id
 */
export async function sendResendEmail(
  context: string,
  options: CreateEmailOptions,
): Promise<string> {
  const { data, error } = await resend.emails.send(options);

  if (error) {
    const err = new ResendSendError(context, error.name, error.message);
    console.error('[sendResendEmail]', { context, resendError: error.name });
    throw err;
  }

  if (!data?.id) {
    const err = new ResendSendError(context, 'empty_response', 'respuesta sin id de email');
    console.error('[sendResendEmail]', { context, resendError: 'empty_response' });
    throw err;
  }

  console.info('[sendResendEmail] enviado', { context, id: data.id });
  return data.id;
}
