import { z } from 'zod';
import { router, adminProcedure } from '@/server/trpc';
import { globalSearch } from '@/lib/queries/search';

export const searchRouter = router({
  global: adminProcedure
    .input(
      z.object({
        q: z.string().max(100),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ input, ctx }) => {
      return globalSearch(input.q, {
        session: {
          userId: ctx.session.userId,
          role: ctx.session.role,
        },
        limit: input.limit,
      });
    }),
});
