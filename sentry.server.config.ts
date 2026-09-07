import * as Sentry from '@sentry/nextjs';

import { env } from '@/lib/env';
import { scrubSentryEvent, scrubSentryTransaction } from '@/lib/observability/sentry-privacy';

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  includeLocalVariables: false,
  tracesSampleRate: env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  beforeSend: scrubSentryEvent,
  beforeSendTransaction: scrubSentryTransaction,
});
