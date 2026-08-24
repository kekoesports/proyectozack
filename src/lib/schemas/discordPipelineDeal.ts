import { z } from 'zod';

/** Snowflake de Discord: 17-20 dígitos. */
const Snowflake = z.string().trim().regex(/^\d{17,20}$/, 'No es un id de Discord');

/**
 * `rawText` se guarda con un tope de 10.000 caracteres. Un mensaje de Discord
 * cabe de sobra (2.000, o 4.000 con Nitro), pero el contenido puede venir
 * concatenado con embeds. Se trunca aquí de forma explícita en lugar de dejar
 * que Zod devuelva un 400 aguas abajo: perder la cola de un mensaje larguísimo
 * es mejor que descartar el trato entero.
 */
export const DISCORD_CONTENT_MAX = 10_000;

const DiscordMessage = z.object({
  messageId: Snowflake,
  channelId: Snowflake,
  authorId: Snowflake.optional(),
  authorUsername: z.string().trim().min(1).max(80).optional(),
  content: z
    .string()
    .min(1)
    .transform((value) => value.slice(0, DISCORD_CONTENT_MAX)),
  timestamp: z.string().trim().max(40).optional(),
});

export const DiscordPipelineDealsIntake = z.object({
  /** Tope por lote: un sondeo cada 2 min no debería traer más. */
  messages: z.array(DiscordMessage).min(1).max(25),
});

export type DiscordMessageInput = z.infer<typeof DiscordMessage>;
export type DiscordPipelineDealsIntakeInput = z.infer<typeof DiscordPipelineDealsIntake>;

/** Clave de idempotencia. Un mensaje de Discord se procesa una sola vez. */
export function discordExternalId(messageId: string): string {
  return `discord:message:${messageId}`;
}
