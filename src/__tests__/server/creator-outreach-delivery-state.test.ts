jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/env', () => ({ env: { CREATOR_OUTREACH_NO_RESPONSE_DAYS: 7 } }));

import { creatorDeliveryState } from '@/lib/queries/creatorOutreach';
import { gmailRecipientEmails } from '@/lib/queries/gmailSentSync';

it('reconcilia un delivered que llega antes de asociar el provider id', () => {
  expect(creatorDeliveryState(['email.sent', 'email.delivered'])).toEqual({
    message: 'delivered', thread: 'delivered',
  });
});

it('acepta únicamente destinatarios externos del Gmail operativo', () => {
  expect(gmailRecipientEmails({
    from: 'pcamacho@socialpro.es',
    to: ['creator@example.com', 'creator@example.com'],
    cc: ['pcamacho@socialpro.es'],
    bcc: [],
  })).toEqual(['creator@example.com']);
  expect(gmailRecipientEmails({
    from: 'otra-cuenta@socialpro.es',
    to: ['creator@example.com'],
    cc: [],
    bcc: [],
  })).toEqual([]);
});

it('prioriza quejas y fallos sobre una entrega anterior', () => {
  expect(creatorDeliveryState(['email.delivered', 'email.complained'])).toEqual({
    message: 'complained', thread: 'complained',
  });
  expect(creatorDeliveryState(['email.delivered', 'email.bounced'])).toEqual({
    message: 'failed', thread: 'bounced',
  });
});
