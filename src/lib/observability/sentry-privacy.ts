import type { ErrorEvent, Event } from '@sentry/nextjs';

type SentryTransactionEvent = Event & { type: 'transaction' };

function stripQueryAndFragment(value: string | undefined): string | undefined {
  if (!value) return value;

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

/**
 * Conserva la información útil para depurar sin enviar cookies, cabeceras,
 * cuerpos, query strings ni identidad del usuario a Sentry.
 */
function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    const request: NonNullable<ErrorEvent['request']> = {};
    const url = stripQueryAndFragment(event.request.url);
    if (event.request.method) request.method = event.request.method;
    if (url) request.url = url;
    event.request = request;
  }

  delete event.user;
  return event;
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  return scrubEvent(event);
}

export function scrubSentryTransaction(event: SentryTransactionEvent): SentryTransactionEvent {
  return scrubEvent(event);
}
