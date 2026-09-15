import { TWITCH_COPY, TWITCH_LANGUAGES, TWITCH_PATHS, twitchMetadata } from '@/features/twitch/landing-content';
import { parseContactSource } from '@/lib/schemas/contact-source';
import { contactBodySchema } from '@/lib/schemas/contact';
import { isCurrentDatedGiveaway, verifiedDateLabel } from '@/lib/brand-verification';

describe('Twitch language and contact contracts', () => {
  it.each(['es', 'en'] as const)('keeps %s canonical, reciprocal languages and exact title', (locale) => {
    const meta = twitchMetadata(locale);
    expect(meta.title).toEqual({ absolute: TWITCH_COPY[locale].title });
    expect(meta.description).toBe(TWITCH_COPY[locale].description);
    expect(meta.alternates?.canonical).toBe(TWITCH_LANGUAGES[locale]);
    expect(meta.alternates?.languages).toEqual(TWITCH_LANGUAGES);
    expect(TWITCH_LANGUAGES[locale]).toContain(TWITCH_PATHS[locale]);
    expect(TWITCH_LANGUAGES['x-default']).toBe(TWITCH_LANGUAGES.es);
  });

  it('accepts only known, non-personal landing source identifiers', () => {
    expect(parseContactSource('twitch-streamers-agency')).toBe('twitch-streamers-agency');
    expect(parseContactSource('agencia-streamers-twitch')).toBe('agencia-streamers-twitch');
    for (const input of [undefined, ['twitch-streamers-agency'], 'person@example.com', 'https://evil.example']) {
      expect(parseContactSource(input)).toBeUndefined();
    }
    expect(contactBodySchema.safeParse({ name: 'TEST Brand', email: 'test@example.com', type: 'brand', message: 'Synthetic test message', source: 'person@example.com' }).success).toBe(false);
  });
});

describe('Truthful verification and expiry', () => {
  const now = new Date('2026-09-15T12:00:00Z');
  it('never invents a verification date or accepts a future/invalid date', () => {
    expect(verifiedDateLabel(undefined, now)).toBeNull();
    expect(verifiedDateLabel('2026-02-30T00:00:00Z', now)).toBeNull();
    expect(verifiedDateLabel('2026-09-16T00:00:00Z', now)).toBeNull();
    expect(verifiedDateLabel('2026-09-14T12:00:00Z', now)).toContain('14 de septiembre de 2026');
  });
  it('excludes expired, undated, future and cancelled giveaways', () => {
    // Only lifecycle fields are relevant to this predicate.
    const current = { status: 'active', startsAt: new Date('2026-09-14'), endsAt: new Date('2026-09-16') };
    expect(isCurrentDatedGiveaway(current, now)).toBe(true);
    expect(isCurrentDatedGiveaway({ ...current, endsAt: now }, now)).toBe(false);
    expect(isCurrentDatedGiveaway({ ...current, endsAt: null }, now)).toBe(false);
    expect(isCurrentDatedGiveaway({ ...current, startsAt: new Date('2026-09-16') }, now)).toBe(false);
    expect(isCurrentDatedGiveaway({ ...current, status: 'cancelled' }, now)).toBe(false);
  });
});
