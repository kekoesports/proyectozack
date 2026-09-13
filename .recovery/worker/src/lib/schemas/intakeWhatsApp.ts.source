import { z } from 'zod';

const Id = z.string().min(1).max(160);
const Message = z.object({
  id: Id, from: z.string().regex(/^\d{7,15}$/), to: z.string().regex(/^\d{7,15}$/).optional(),
  timestamp: z.string().regex(/^\d{1,12}$/), type: z.string().max(40),
  text: z.object({ body: z.string().max(4000) }).optional(),
});
export const IntakeWhatsAppUpdate = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: Id,
    changes: z.array(z.object({
      field: z.string().max(100),
      value: z.object({
        messaging_product: z.string().optional(), event: z.string().max(100).optional(),
        metadata: z.object({ phone_number_id: Id, display_phone_number: z.string().max(40).optional() }).optional(),
        messages: z.array(Message).max(20).optional(),
        message_echoes: z.array(Message).max(20).optional(),
      }),
    })).max(20),
  })).max(20),
});
export type IntakeWhatsAppUpdate = z.infer<typeof IntakeWhatsAppUpdate>;
export const IntakeWhatsAppVerification = z.object({
  'hub.mode': z.literal('subscribe'), 'hub.verify_token': z.string().min(32).max(256),
  'hub.challenge': z.string().regex(/^\d{1,100}$/),
});
export const IntakeWhatsAppReceipt = z.object({
  messaging_product: z.literal('whatsapp'),
  messages: z.array(z.object({ id: Id })).length(1),
});
export const IntakeWhatsAppPhone = z.object({
  id: Id, display_phone_number: z.string(), is_on_biz_app: z.literal(true), platform_type: z.literal('CLOUD_API'),
});
