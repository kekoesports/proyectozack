import { enrichPublicCreator, safeCreatorPublicWebsite } from '@/lib/targets/creator-enrichment';
import { creatorEnrichmentResultSchema } from '@/lib/schemas/creator-enrichment';

const syncedAt = '2026-09-05T12:00:00.000Z';
const observedAt = '2026-09-05T11:58:00.000Z';
const publicField = (value: string) => ({ value, source: 'youtube:channels:snippet.description', observedAt });
const enrich = (bio: string) => enrichPublicCreator({ syncedAt, bio: publicField(bio) });

it('extracts only a nearby explicit professional email, with original source and observation date', () => {
  const result = enrich('Personal: private@example.org\nBusiness inquiries: Partner@EXAMPLE.ORG');
  expect(result).toMatchObject({ ok: true, fields: {
    contactEmail: { value: 'Partner@example.org', source: 'youtube:channels:snippet.description',
      observed_at: observedAt, synced_at: syncedAt, status: 'available', confidence: 'MEDIUM' },
  } });
  expect(JSON.stringify(result)).not.toContain('private@example.org');
  expect(creatorEnrichmentResultSchema.safeParse(result).success).toBe(true);
});

it.each([
  'Just an address: person@example.org',
  'Email: person@example.org',
  'Personal contact: person@example.org',
  'Business: contact [at] example [dot] org',
  'Business: ' + 'x'.repeat(121) + ' person@example.org',
  'Business: Person＠example.org',
  'Business: ' + 'a'.repeat(65) + '@example.org',
  'Business: person@example.' + 'x'.repeat(64),
])('does not invent, decode or collect a private/unqualified email: %s', bio => {
  expect(enrich(bio)).toMatchObject({ ok: true, fields: { contactEmail: {
    value: null, observed_at: null, status: 'unavailable', confidence: 'LOW',
  } } });
});

it('accepts an explicitly named public business-email provider field without scraping', () => {
  const result = enrichPublicCreator({ syncedAt, professionalPublicFields: [
    { ...publicField('agency@example.org'), kind: 'business_email' },
  ] });
  expect(result).toMatchObject({ ok: true, fields: { contactEmail: { value: 'agency@example.org' } } });
});

it('does not choose arbitrarily between conflicting professional addresses', () => {
  const result = enrich('Business: a@example.org\nManagement: b@example.org');
  expect(result).toMatchObject({ ok: true, fields: { contactEmail: { value: null } },
    warnings: ['ambiguous_professional_email'] });
});

it('keeps an explicitly visible, bounded management label, not its email or links', () => {
  expect(enrich('Management: Example Agency | business@example.org https://agency.example.org')).toMatchObject({
    ok: true, fields: { management: { value: 'Example Agency', confidence: 'MEDIUM' } },
  });
  const result = enrichPublicCreator({ syncedAt, professionalPublicFields: [
    { ...publicField('A'.repeat(250)), kind: 'management' },
  ] });
  expect(result).toMatchObject({ ok: true, fields: { management: { value: 'A'.repeat(160) } } });
});

it('does not infer management, country or gender from unrelated profile content', () => {
  const result = enrich('From Madrid. Proud gamer. Team enthusiast.');
  expect(result).toMatchObject({ ok: true, fields: { management: { value: null } } });
  expect(JSON.stringify(result)).not.toMatch(/country|gender|Madrid/);
});

it.each([
  'javascript:alert(1)', 'javascript://www.youtube.com/@example', '//example.org/path',
  'https://user:pass@example.org', 'https://127.0.0.1', 'https://2130706433', 'https://0x7f000001',
  'https://[::1]', 'https://localhost', 'https://a.localhost', 'https://intranet',
  'https://intranet.local', 'https://example.org:8080', 'https://example.org\\@localhost',
  'https://example.org\u0000/path', 'https://foo..org', 'https://-foo.org', 'https://foo-.org',
])('rejects non-public or unsafe website syntax: %s', value => {
  expect(safeCreatorPublicWebsite(value)).toBeNull();
});

it('accepts an explicit public HTTP(S) website without making a request', () => {
  const fetcher = jest.spyOn(global, 'fetch');
  try {
    const result = enrichPublicCreator({ syncedAt, website: publicField('https://agency.example.org/contact#section') });
    expect(result).toMatchObject({ ok: true, fields: { website: { value: 'https://agency.example.org/contact' } } });
    expect(fetcher).not.toHaveBeenCalled();
    expect(safeCreatorPublicWebsite('http://agency.example.org')).toBe('http://agency.example.org/');
  } finally { fetcher.mockRestore(); }
});

it('canonicalizes only the four supported profile families as review-only crosslinks', () => {
  const result = enrich([
    'https://www.youtube.com/@SyntheticCreator?utm_source=bio',
    'https://m.twitch.tv/ExampleCreator/about#info',
    'https://kick.com/ExampleCreator',
    'https://www.instagram.com/Example.Creator/?igshid=tracking',
    'https://www.twitch.tv/examplecreator',
  ].join('\n'));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected valid fixture');
  expect(result.crosslinks.map(link => [link.platform, link.observation.value])).toEqual([
    ['youtube', 'https://www.youtube.com/@SyntheticCreator'],
    ['twitch', 'https://www.twitch.tv/examplecreator'],
    ['kick', 'https://kick.com/examplecreator'],
    ['instagram', 'https://www.instagram.com/example.creator'],
  ]);
  expect(result.crosslinks.every(link => link.requiresReview && !link.autoMerge
    && link.observation.confidence === 'MEDIUM' && link.observation.observed_at === observedAt)).toBe(true);
  expect(creatorEnrichmentResultSchema.safeParse(result).success).toBe(true);
});

it.each([
  'https://youtu.be/abcdefghijk', 'https://youtube.com/watch?v=abcdefghijk',
  'https://youtube.com/shorts/abcdefghijk', 'https://instagram.com/p/abc',
  'https://instagram.com/accounts', 'https://twitch.tv/directory', 'https://kick.com/categories',
  'https://youtube.com.evil.org/@example', 'https://bit.ly/example', 'https://twitter.com/example',
])('does not promote content URLs, redirects or unsupported networks to identity links: %s', value => {
  expect(enrich(value)).toMatchObject({ ok: true, crosslinks: [] });
});

it('bounds crosslinks without collecting extra fields', () => {
  const result = enrich(Array.from({ length: 25 }, (_, index) => 'https://twitch.tv/creator' + index).join('\n'));
  if (!result.ok) throw new Error('Expected valid fixture');
  expect(result.crosslinks).toHaveLength(20);
  expect(result.warnings).toContain('crosslink_limit');
});

it('is deterministic and does not mutate provider input', () => {
  const input = { syncedAt, bio: publicField('Business: contact@example.org') };
  const original = JSON.stringify(input);
  expect(enrichPublicCreator(input)).toEqual(enrichPublicCreator(input));
  expect(JSON.stringify(input)).toBe(original);
});

it.each([
  { syncedAt, privateEmail: 'private@example.org' },
  { syncedAt, bio: { ...publicField('Business: a@example.org'), observedAt: '2026-09-06T00:00:00.000Z' } },
  { syncedAt, bio: { ...publicField('Bio'), source: 'https://provider.example.org/?token=SECRET' } },
])('rejects unknown/private fields and invalid evidence metadata without echoing content', input => {
  expect(enrichPublicCreator(input)).toEqual({ ok: false, error: 'invalid_input' });
});
