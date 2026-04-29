import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { router, publicProcedure } from '@/server/trpc';
import { db } from '@/lib/db';
import { codeClicks, creatorCodes } from '@/db/schema';

export const giveawaysRouter = router({
  trackClick: publicProcedure
    .input(
      z.object({
        codeId: z.number().int().positive(),
        action: z.enum(['copy', 'cta']),
      }),
    )
    .mutation(async ({ input }) => {
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
