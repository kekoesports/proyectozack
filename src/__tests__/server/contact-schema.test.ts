import { contactBodySchema } from '@/lib/schemas/contact';

const valid = {
  name: 'Alice',
  email: 'alice@example.com',
  type: 'brand',
  message: 'Looking to collaborate on a campaign.',
};

describe('contactBodySchema', () => {
  it('accepts a valid payload', () => {
    expect(contactBodySchema.safeParse(valid).success).toBe(true);
  });

  it('accepts payload with optional company', () => {
    const result = contactBodySchema.safeParse({ ...valid, company: 'ACME Corp' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.company).toBe('ACME Corp');
  });

  it('rejects a name shorter than 2 chars', () => {
    const result = contactBodySchema.safeParse({ ...valid, name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toContain('name');
  });

  it('rejects an invalid email', () => {
    expect(contactBodySchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a message shorter than 10 chars', () => {
    expect(contactBodySchema.safeParse({ ...valid, message: 'short' }).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(contactBodySchema.safeParse({}).success).toBe(false);
  });

  it('requires profile details only for creator contacts', () => {
    const incomplete = contactBodySchema.safeParse({ ...valid, type: 'talent' });
    expect(incomplete.success).toBe(false);
    if (!incomplete.success) {
      expect(incomplete.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['country', 'platform', 'channelUrl', 'contentCategory']),
      );
    }

    expect(contactBodySchema.safeParse({
      ...valid,
      type: 'talent',
      country: 'España',
      platform: 'youtube',
      channelUrl: 'https://youtube.com/@alice',
      contentCategory: 'Counter-Strike 2',
      followers: '50K',
      averageAudience: '15K visualizaciones',
    }).success).toBe(true);
  });
});
