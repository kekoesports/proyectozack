import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { router, brandProcedure } from '@/server/trpc';
import { db } from '@/lib/db';
import { talentProposals, talents } from '@/db/schema';
import { proposalSchema } from '@/lib/schemas/proposal';

export const proposalsRouter = router({
  submit: brandProcedure
    .input(proposalSchema)
    .mutation(async ({ input, ctx }) => {
      const talent = await db
        .select({ id: talents.id })
        .from(talents)
        .where(eq(talents.id, input.talentId));

      if (talent.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Talent no encontrado' });
      }

      const existing = await db
        .select({ id: talentProposals.id })
        .from(talentProposals)
        .where(
          and(
            eq(talentProposals.brandUserId, ctx.session.userId),
            eq(talentProposals.talentId, input.talentId),
            eq(talentProposals.status, 'pendiente'),
          ),
        );

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya tienes una propuesta pendiente para este talento',
        });
      }

      try {
        await db.insert(talentProposals).values({
          brandUserId: ctx.session.userId,
          talentId: input.talentId,
          campaignType: input.campaignType,
          budgetRange: input.budgetRange,
          timeline: input.timeline,
          message: input.message,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('unique') || message.includes('duplicate')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ya tienes una propuesta pendiente para este talento',
          });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      }

      return { success: true };
    }),
});
