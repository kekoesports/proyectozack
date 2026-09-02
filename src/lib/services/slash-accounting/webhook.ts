'server-only';

import { verify } from 'node:crypto';
import { z } from 'zod';

const SLASH_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq4+a15r2X7AU0erQGfNv
aNm4Rxd4XEFBIk+kARNydOaM0YoT56h07BD98KEQth7J3FWnSZL/gbv0rKrn5HhM
BMVloueB3irr+9mg6ORQ5ug0NVYnaQpGIaEjlrBdjrdk5gPepT6ztbaYSnfl8lzH
5JGc0Gq38HO2cfZlXQHT4mKy7im6Pa76z6NcXOaUh8O7lvskC1ckhhoGz8p4pd3v
wJi5YFwRAjFmJ8FRYhbPZXpTW796rH6EhIMkjHbVwf6yTKmiHeaXQ/14jcqhUJan
0mrF9cV3tgzb+l2XMDDKQlQGsfyGGdmE1APnQb6MK1IB/iVt8ntEQ8deKgkwH/wi
NQIDAQAB
-----END PUBLIC KEY-----`;

export const slashWebhookEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  entityId: z.string().min(1).max(200),
  event: z.enum([
    'card.update',
    'card.delete',
    'card_creation.event',
    'aggregated_transaction.create',
    'aggregated_transaction.update',
    'expense_report.create',
    'expense_report.update',
  ]),
});

export type SlashWebhookEvent = z.infer<typeof slashWebhookEventSchema>;

export function verifySlashWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  try {
    return verify(
      'sha256',
      Buffer.from(rawBody),
      SLASH_PUBLIC_KEY,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}
