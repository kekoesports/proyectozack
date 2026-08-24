import { z } from 'zod';

const OptionalTelegramText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).optional();

export const AutomationTelegramRefillCreate = z.object({
  updateId: z.number().int().positive(),
  chatId: z.string().trim().regex(/^-?\d+$/).max(32),
  chatTitle: OptionalTelegramText(255),
  requesterUsername: OptionalTelegramText(64),
  requesterName: OptionalTelegramText(200),
  brand: z.string().trim().min(1).max(200),
  creator: z.string().trim().min(1).max(200),
  amount: OptionalTelegramText(120),
  note: OptionalTelegramText(2000),
});

export const AutomationTelegramRefillTaskId = z.coerce.number().int().positive();

export type AutomationTelegramRefillCreateInput = z.infer<
  typeof AutomationTelegramRefillCreate
>;
