import { NextResponse } from 'next/server';
import { finishSlashWebhookEvent, registerSlashWebhookEvent } from '@/lib/queries/slashAccounting';
import {
  closeSlashCardById,
  syncSlashCardById,
  syncSlashTransactionById,
} from '@/lib/services/slash-accounting/sync';
import { slashWebhookEventSchema, verifySlashWebhookSignature } from '@/lib/services/slash-accounting/webhook';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  if (!verifySlashWebhookSignature(rawBody, request.headers.get('slash-webhook-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = slashWebhookEventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  const event = parsed.data;
  const isNew = await registerSlashWebhookEvent({
    eventId: event.eventId,
    entityId: event.entityId,
    eventType: event.event,
  });
  if (!isNew) return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (event.event === 'aggregated_transaction.create' || event.event === 'aggregated_transaction.update') {
      await syncSlashTransactionById(event.entityId);
    } else if (event.event === 'card.delete') {
      await closeSlashCardById(event.entityId);
    } else if (event.event === 'card.update' || event.event === 'card_creation.event') {
      await syncSlashCardById(event.entityId);
    } else {
      await finishSlashWebhookEvent(event.eventId, 'ignored');
      return NextResponse.json({ ok: true, ignored: true });
    }
    await finishSlashWebhookEvent(event.eventId, 'processed');
    return NextResponse.json({ ok: true });
  } catch (error) {
    await finishSlashWebhookEvent(
      event.eventId,
      'failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    console.error('[slash-webhook] processing failed', {
      eventId: event.eventId,
      type: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
