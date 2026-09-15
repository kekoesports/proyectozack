import { z } from 'zod';
import type { GiveawayWithTalent } from '@/types';

/** Editorial year, independent of render time and verification claims. */
export const KEYDROP_CONTENT_YEAR = 2026;

export function verifiedDateLabel(value: string | undefined, now = new Date()): string | null {
  const parsed = z.iso.datetime({ offset: true }).safeParse(value);
  if (!parsed.success) return null;
  const date = new Date(parsed.data);
  if (date > now) return null;
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(date);
}

/** Missing end dates are not evidence that a promotion is still current. */
export function isCurrentDatedGiveaway(giveaway: Pick<GiveawayWithTalent, 'status' | 'startsAt' | 'endsAt'>, now = new Date()): boolean {
  return giveaway.status === 'active' && giveaway.startsAt <= now &&
    giveaway.endsAt !== null && giveaway.endsAt > now;
}

export function promotionalRel(brandName: string): string {
  return brandName.toLowerCase() === 'keydrop' ? 'sponsored noopener noreferrer' : 'noopener noreferrer';
}
