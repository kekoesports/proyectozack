import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { router, publicProcedure } from '@/server/trpc';
import { db } from '@/lib/db';
import { creatorApplications } from '@/db/schema';
import { checkRateLimit } from '@/lib/security/rateLimit';

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
      const h = await headers();
      const rawIp =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        '127.0.0.1';

      const rl = checkRateLimit({ key: `creatorApply:${rawIp}`, limit: 3, windowMs: 60_000 });
      if (!rl.ok) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Demasiados intentos. Espera un momento antes de volver a aplicar.',
        });
      }

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
