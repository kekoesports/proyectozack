import { z } from 'zod';

const TelegramUser = z.object({ id: z.number().int().positive(), is_bot: z.boolean().optional() });
export const IntakeTelegramUpdate = z.object({
  update_id: z.number().int().nonnegative(),
  business_connection: z.object({ id: z.string(), is_enabled: z.boolean() }).optional(),
  business_message: z.object({
    message_id: z.number().int().positive(), date: z.number().int().positive(),
    business_connection_id: z.string().min(1),
    from: TelegramUser.optional(), sender_business_bot: TelegramUser.optional(),
    chat: z.object({ id: z.number().int(), type: z.string() }),
    text: z.string().max(4000).optional(), caption: z.string().max(1024).optional(),
  }).optional(),
});
export type IntakeTelegramUpdate = z.infer<typeof IntakeTelegramUpdate>;
export const IntakeTelegramHeader = z.string().min(32).max(256).regex(/^[A-Za-z0-9_-]+$/);
export const IntakeTelegramReceipt = z.object({
  ok: z.literal(true), result: z.object({ message_id: z.number().int().positive() }),
});
export const IntakeTelegramConnection = z.object({
  ok: z.literal(true), result: z.object({
    id: z.string(), is_enabled: z.boolean(), user: TelegramUser,
    rights: z.object({ can_reply: z.boolean().optional() }).optional(),
  }),
});
