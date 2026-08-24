/**
 * Intake de #pipeline-deals.
 *
 * n8n sondea el canal cada 15 minutos con la credencial del bot y publica aquí
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

import { parseDiscordDealMessage } from '@/lib/parsers/discordDeal';
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
  readonly status?: string;
  readonly missingFields?: readonly string[];
  readonly warnings?: readonly string[];
};

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

      const extraction = parseDiscordDealMessage(message.content);
      if (!extraction.looksLikeDeal) {
        // Charla normal del canal: no deja rastro ni ocupa la cola de revisión.
        outcomes.push({ messageId: message.messageId, result: 'ignored' });
        continue;
      }

      const draft = await createAutomationDealDraft({
        source: 'discord',
        externalId,
        sourceUserId: message.authorId,
        sourceChannelId: message.channelId,
        rawText: message.content,
        proposedDeal: extraction.proposedDeal,
      });

      outcomes.push({
        messageId: message.messageId,
        result: draft.created ? 'created' : 'already_seen',
        draftId: draft.id,
        status: draft.status,
        missingFields: draft.missingFields,
        warnings: extraction.warnings,
      });
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
  };
  console.info('[pipeline-deals] lote procesado', summary);

  return NextResponse.json({ ok: true, summary, outcomes }, { status: 200 });
}
