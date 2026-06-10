import { z } from 'zod';

export const contactBodySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email().max(200),
  phone: z.string().max(30).optional(),
  type: z.enum(['brand', 'talent', 'other']),
  company: z.string().max(100).optional(),
  message: z.string().min(10).max(5000),
  // Brand-specific
  budget: z.string().max(20).optional(),
  timeline: z.string().max(30).optional(),
  audience: z.string().max(200).optional(),
  vertical: z.string().max(30).optional(),
  campaignType: z.string().max(50).optional(),
  // Creator-specific
  platform: z.string().max(30).optional(),
  viewers: z.string().max(100).optional(),
  monetization: z.string().max(200).optional(),
});

export type ContactBody = z.infer<typeof contactBodySchema>;
