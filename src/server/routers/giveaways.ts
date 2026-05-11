import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { router, publicProcedure } from '@/server/trpc';
import { db } from '@/lib/db';
import { codeClicks, creatorCodes } from '@/db/schema';
import { checkRateLimit } from '@/lib/security/rateLimit';

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  );
}

export const giveawaysRouter = router({
  trackClick: publicProcedure
    .input(
      z.object({
        codeId: z.number().int().positive(),
        action: z.enum(['copy', 'cta']),
      }),
    )
    .mutation(async ({ input }) => {
      const ip = await clientIp();
      const limit = checkRateLimit({
        key: `trackClick:${ip}`,
        limit: 30,
        windowMs: 60_000,
      });
      if (!limit.ok) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Demasiados clicks, esperá un momento.' });
      }

      const [code] = await db
        .select({ talentId: creatorCodes.talentId, brandName: creatorCodes.brandName })
        .from(creatorCodes)
        .where(eq(creatorCodes.id, input.codeId));

      if (!code) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Código no encontrado' });
      }

      await db.insert(codeClicks).values({
        codeId: input.codeId,
        talentId: code.talentId,
        brandName: code.brandName,
        action: input.action,
      });

      return { ok: true };
    }),
});
