import { z } from 'zod';

export const contactSourceSchema = z.enum(['twitch-streamers-agency', 'agencia-streamers-twitch']);
export type ContactSource = z.infer<typeof contactSourceSchema>;

/** Only known landing identifiers are stored, never arbitrary query strings. */
export function parseContactSource(value: unknown): ContactSource | undefined {
  const parsed = contactSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
