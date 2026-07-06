import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRaffleParticipants } from '@/lib/queries/giveawayPlatform';

/**
 * GET /api/sorteos/participants/[raffleId]?limit=20&offset=0
 *
 * Devuelve la lista pública de participantes de un sorteo, respetando
 * `player_profiles.isPrivate`. Nunca expone email, tradeUrl, steamId ni IP.
 */

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const ParamsSchema = z.object({
  raffleId: z.coerce.number().int().positive(),
});

export async function GET(
  request: Request,
  ctx: { params: Promise<{ raffleId: string }> },
): Promise<NextResponse> {
  const rawParams = await ctx.params;
  const params = ParamsSchema.safeParse(rawParams);
  if (!params.success) {
    return NextResponse.json({ error: 'invalid_raffle_id' }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = QuerySchema.safeParse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }

  const participants = await getRaffleParticipants(
    params.data.raffleId,
    query.data.limit,
    query.data.offset,
  );

  return NextResponse.json({
    participants: participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      enteredAt: p.enteredAt.toISOString(),
    })),
  });
}
