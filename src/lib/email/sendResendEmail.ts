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
  requestOptions?: { readonly idempotencyKey?: string },
): Promise<string> {
  const relayUrl = env.EMAIL_RELAY_URL;
  const relayToken = env.EMAIL_RELAY_TOKEN;
  if (relayUrl || relayToken) {
    if (!relayUrl || !relayToken) {
      throw new ResendSendError(context, 'relay_misconfigured', 'relé de email incompleto');
    }
    try {
      return await sendEmailThroughRelay(context, options, requestOptions, relayUrl, relayToken);
    } catch (error) {
      // A 404/410 is definitive: the retired relay never accepted the email,
      // so falling back to the local Resend client cannot create a duplicate.
      // Do not fall back on timeouts or 5xx responses because delivery may be
      // ambiguous in those cases.
      if (
        error instanceof ResendSendError
        && (error.resendErrorName === 'relay_http_404' || error.resendErrorName === 'relay_http_410')
      ) {
        console.warn('[sendResendEmail] relé retirado; usando envío directo', {
          context,
          relayError: error.resendErrorName,
        });
        return sendDirectResendEmail(context, options, requestOptions);
      }
      throw error;
    }
  }

  return sendDirectResendEmail(context, options, requestOptions);
}

export async function sendDirectResendEmail(
  context: string,
  options: CreateEmailOptions,
  requestOptions?: { readonly idempotencyKey?: string },
): Promise<string> {
  const response = requestOptions?.idempotencyKey
    ? await resend.emails.send(options, { idempotencyKey: requestOptions.idempotencyKey })
    : await resend.emails.send(options);
  const { data, error } = response;

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

async function sendEmailThroughRelay(
  context: string,
  options: CreateEmailOptions,
  requestOptions: { readonly idempotencyKey?: string } | undefined,
  relayUrl: string,
  relayToken: string,
): Promise<string> {
  const response = await fetch(relayUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${relayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ context, options, requestOptions }),
    signal: AbortSignal.timeout(20_000),
  });

  const body = await response.json().catch(() => null) as {
    id?: string;
    error?: { name?: string; message?: string };
  } | null;
  if (!response.ok || !body?.id) {
    const errorName = body?.error?.name ?? `relay_http_${response.status}`;
    const detail = body?.error?.message ?? 'el relé no aceptó el email';
    console.error('[sendResendEmail]', { context, resendError: errorName });
    throw new ResendSendError(context, errorName, detail);
  }

  console.info('[sendResendEmail] enviado por relé', { context, id: body.id });
  return body.id;
}
