/**
 * Intake de #pipeline-deals.
 *
 * n8n sondea el canal cada 2 minutos con la credencial del bot y publica aquí
 * el lote de mensajes en crudo. El sondeo vive en n8n porque allí ya está el
 * token del bot; el parseo vive aquí porque es donde puede tener Zod y tests.
 *
 * Un mensaje ya procesado se descarta ANTES de parsear: el sondeo vuelve a ver
 * los mismos mensajes en cada pasada, y sin ese corte se repetiría el trabajo
 * de extracción unas 96 veces al día por mensaje.
 *
 * Este endpoint NO crea campañas: deja borradores para que alguien los revise.
 * Nunca toca `campaigns` ni dispara sincronizaciones.
 */
import { NextResponse } from 'next/server';

import { parseDiscordDealEntries } from '@/lib/parsers/discordDeal';
import {
  createAutomationDealDraft,
  findAutomationDealDraftByExternalId,
} from '@/lib/queries/automationDealDrafts';
import {
  DiscordPipelineDealsIntake,
  discordExternalId,
} from '@/lib/schemas/discordPipelineDeal';
import { verifyAutomationToken } from '@/lib/security/assertAutomationAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type MessageOutcome = {
  readonly messageId: string;
  readonly result: 'created' | 'already_seen' | 'ignored' | 'failed';
  readonly draftId?: number;
  readonly draftIds?: readonly number[];
  readonly status?: string;
  readonly missingFields?: readonly string[];
  readonly warnings?: readonly string[];
  readonly createdDrafts?: number;
  readonly alreadySeenDrafts?: number;
};

type DraftEntryOutcome = Omit<MessageOutcome, 'messageId' | 'draftIds'>;

function aggregateMessageOutcome(
  messageId: string,
  entries: readonly DraftEntryOutcome[],
): MessageOutcome {
  const draftIds = entries.flatMap((entry) => entry.draftId === undefined ? [] : [entry.draftId]);
  const statuses = entries.flatMap((entry) => entry.status ? [entry.status] : []);
  const missingFields = [...new Set(entries.flatMap((entry) => entry.missingFields ?? []))];
  const warnings = [...new Set(entries.flatMap((entry) => entry.warnings ?? []))];
  const result = entries.some((entry) => entry.result === 'failed')
    ? 'failed'
    : entries.some((entry) => entry.result === 'created')
      ? 'created'
      : entries.every((entry) => entry.result === 'ignored')
        ? 'ignored'
        : 'already_seen';
  const status = statuses.includes('missing_info')
    ? 'missing_info'
    : statuses.includes('pending_review')
      ? 'pending_review'
      : statuses[0];
  return {
    messageId,
    result,
    ...(draftIds[0] === undefined ? {} : { draftId: draftIds[0] }),
    draftIds,
    ...(status === undefined ? {} : { status }),
    missingFields,
    warnings,
    createdDrafts: entries.filter((entry) => entry.result === 'created').length,
    alreadySeenDrafts: entries.filter((entry) => entry.result === 'already_seen').length,
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = verifyAutomationToken(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.reason === 'missing-config' ? 503 : 401 },
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = DiscordPipelineDealsIntake.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid-body', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const outcomes: MessageOutcome[] = [];

  for (const message of parsed.data.messages) {
    const externalId = discordExternalId(message.messageId);
    try {
      const seen = await findAutomationDealDraftByExternalId('discord', externalId);
      if (seen) {
        outcomes.push({
          messageId: message.messageId,
          result: 'already_seen',
          draftId: seen.id,
          status: seen.status,
        });
        continue;
      }

      const extractions = parseDiscordDealEntries(message.content);
      if (extractions.length === 1 && !extractions[0]?.looksLikeDeal) {
        // Charla normal del canal: no deja rastro ni ocupa la cola de revisión.
        outcomes.push({ messageId: message.messageId, result: 'ignored' });
        continue;
      }

      const entryOutcomes: DraftEntryOutcome[] = [];
      for (const [index, extraction] of extractions.entries()) {
        const entryExternalId = extractions.length === 1
          ? externalId
          : `${externalId}:deal:${index + 1}`;
        try {
          const entrySeen = extractions.length === 1
            ? null
            : await findAutomationDealDraftByExternalId('discord', entryExternalId);
          if (entrySeen) {
            entryOutcomes.push({
              result: 'already_seen',
              draftId: entrySeen.id,
              status: entrySeen.status,
            });
            continue;
          }
          const draft = await createAutomationDealDraft({
            source: 'discord',
            externalId: entryExternalId,
            sourceUserId: message.authorId,
            sourceChannelId: message.channelId,
            rawText: message.content,
            proposedDeal: extraction.proposedDeal,
          });
          entryOutcomes.push({
            result: draft.created ? 'created' : 'already_seen',
            draftId: draft.id,
            status: draft.status,
            missingFields: draft.missingFields,
            warnings: extraction.warnings,
          });
        } catch (error) {
          console.error('[pipeline-deals] fallo procesando una entrada', {
            messageId: message.messageId,
            entry: index + 1,
            error: error instanceof Error ? error.name : 'unknown',
          });
          entryOutcomes.push({ result: 'failed' });
        }
      }
      outcomes.push(aggregateMessageOutcome(message.messageId, entryOutcomes));
    } catch (error) {
      // Un mensaje que falla no puede tumbar el lote entero: el resto se procesa
      // y n8n reintentará este en la siguiente pasada (sigue sin borrador).
      console.error('[pipeline-deals] fallo procesando un mensaje', {
        messageId: message.messageId,
        error: error instanceof Error ? error.name : 'unknown',
      });
      outcomes.push({ messageId: message.messageId, result: 'failed' });
    }
  }

  const summary = {
    received: parsed.data.messages.length,
    created: outcomes.filter((o) => o.result === 'created').length,
    alreadySeen: outcomes.filter((o) => o.result === 'already_seen').length,
    ignored: outcomes.filter((o) => o.result === 'ignored').length,
    failed: outcomes.filter((o) => o.result === 'failed').length,
    draftsCreated: outcomes.reduce((sum, outcome) => sum + (outcome.createdDrafts ?? 0), 0),
    draftsAlreadySeen: outcomes.reduce(
      (sum, outcome) => sum + (outcome.alreadySeenDrafts ?? 0),
      0,
    ),
  };
  console.info('[pipeline-deals] lote procesado', summary);

  return NextResponse.json({ ok: true, summary, outcomes }, { status: 200 });
}
