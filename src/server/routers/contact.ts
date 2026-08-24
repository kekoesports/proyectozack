import { TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { router, publicProcedure } from '@/server/trpc';
import { db } from '@/lib/db';
import { contactSubmissions } from '@/db/schema';
import { sendContactAcknowledgementEmail, sendContactEmail } from '@/lib/email';
import { contactBodySchema } from '@/lib/schemas/contact';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { logRedacted } from '@/lib/log';

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const contactRouter = router({
  submit: publicProcedure
    .input(contactBodySchema)
    .mutation(async ({ input }) => {
      const h = await headers();
      const rawIp =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        '127.0.0.1';

      const rl = checkRateLimit({ key: `contact:${rawIp}`, limit: 3, windowMs: 60_000 });
      if (!rl.ok) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Demasiados intentos. Espera un momento antes de enviar otro mensaje.',
        });
      }

      const ipHash = await hashIp(rawIp);

      try {
        await db.insert(contactSubmissions).values({
          name: input.name,
          email: input.email,
          phone: input.phone,
          type: input.type,
          company: input.company,
          message: input.message,
          budget: input.budget,
          timeline: input.timeline,
          audience: input.audience,
          vertical: input.vertical,
          campaignType: input.campaignType,
          platform: input.platform,
          viewers: input.viewers,
          monetization: input.monetization,
          ipHash,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        console.error('[trpc/contact] DB error:', msg);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al guardar el mensaje' });
      }

      // El lead YA está guardado. Si el email de aviso falla, no rompemos el
      // UX del formulario público: el usuario sigue viendo su confirmación y
      // el lead es visible en /admin/leads. Devolvemos `warning` para que el
      // caller (y los tests e2e) puedan distinguir "enviado" de "pendiente".
      const [internalNotice, leadAcknowledgement] = await Promise.allSettled([
        sendContactEmail(input),
        sendContactAcknowledgementEmail(input),
      ]);

      let warning: 'email_pending' | undefined;
      if (internalNotice.status === 'rejected') {
        warning = 'email_pending';
        const reason = internalNotice.reason as unknown;
        const msg = reason instanceof Error ? reason.message : 'unknown';
        logRedacted('error', '[trpc/contact] aviso a marketing@ no enviado:', msg);
      }
      if (leadAcknowledgement.status === 'rejected') {
        warning = 'email_pending';
        const reason = leadAcknowledgement.reason as unknown;
        const msg = reason instanceof Error ? reason.message : 'unknown';
        logRedacted('error', '[trpc/contact] acuse automático al lead no enviado:', msg);
      }

      return warning ? { success: true as const, warning } : { success: true as const };
    }),
});
