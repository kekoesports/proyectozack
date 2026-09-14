import { z } from 'zod';
export const IntakeInboxControl = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/), action: z.enum(['retry', 'reviewed']),
});

export const IntakeIdentityPlan = z.object({
  companyPhone: z.string().regex(/^[1-9]\d{6,14}$/),
  bindings: z.array(z.object({ conversationId: z.uuid(), version: z.number().int().nonnegative(),
    phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
    aliases: z.array(z.string().regex(/^\d+@(c\.us|lid)$/)).max(10),
  })).max(1000),
});
