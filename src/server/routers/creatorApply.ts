import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '@/server/trpc';
import { db } from '@/lib/db';
import { creatorApplications } from '@/db/schema';

const creatorApplySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  platform: z.string().min(1).max(50),
  handle: z.string().min(1).max(100),
  followers: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
});

export const creatorApplyRouter = router({
  submit: publicProcedure
    .input(creatorApplySchema)
    .mutation(async ({ input }) => {
      try {
        await db.insert(creatorApplications).values(input);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        console.error('[trpc/creatorApply] DB error:', msg);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al enviar la aplicación' });
      }

      return { success: true };
    }),
});
