import type { ErrorEvent } from '@sentry/nextjs';

import { scrubSentryEvent } from '@/lib/observability/sentry-privacy';

describe('Sentry privacy scrubber', () => {
  it('removes identity and sensitive request fields while retaining the route', () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        url: 'https://socialpro.es/admin?token=secret#fragment',
        method: 'POST',
        cookies: { session: 'secret' },
        headers: { authorization: 'Bearer secret' },
        data: { email: 'person@example.com' },
      },
      user: { email: 'person@example.com', ip_address: '192.0.2.1' },
    };

    expect(scrubSentryEvent(event)).toMatchObject({
      request: { url: 'https://socialpro.es/admin', method: 'POST' },
    });
    expect(event.request).not.toHaveProperty('cookies');
    expect(event.request).not.toHaveProperty('headers');
    expect(event.request).not.toHaveProperty('data');
    expect(event).not.toHaveProperty('user');
  });
});
