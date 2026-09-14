import { IntakeProfile, type IntakeExtraction } from '@/lib/schemas/creatorIntake';
import { qualifyCreator } from '@/lib/intake/qualification';
import { decideIntake, explicitIntakeIntent, validateExtraction } from '@/lib/intake/decision';
import { normalizeTelegramIntake } from '@/lib/intake/telegram-normalize';

const metric = (value: number) => ({ value, periodDays: 30, source: 'declared' as const });
const base: IntakeProfile = {
  interested: true, gamblingPreferences: { casinos: 'discuss', sportsBetting: 'no', cs2Gambling: 'yes' },
  name: 'TEST creador', country: 'España', adult: true, goal: 'Campañas',
  socials: [{ platform: 'twitch', url: 'https://www.twitch.tv/test_fixture' }],
  streamPlatform: 'twitch', averageViewers: metric(100), focusPercent: 30, focusPeriodDays: 30,
  tiktokLive: false, metricsRequested: true,
};
const intake: IntakeExtraction = { profile: {}, evidence: {}, intent: 'intake' };

describe('creator intake business boundaries', () => {
  it.each([[99.9, 30, false], [100, 29.9, false], [100, 30, true], [0, 0, false]])(
    'main lane at viewers=%s share=%s', (viewers, share, expected) => {
      expect(qualifyCreator({ ...base, averageViewers: metric(viewers), focusPercent: share }).main).toBe(expected);
    },
  );
  it.each([[30, false], [30.1, true], [31, true], [0, false]])('TikTok strictly over 30 (%s)', (value, expected) => {
    expect(qualifyCreator({ tiktokLive: true, tiktokBattles: true, tiktokAverageViewers: metric(value) }).tiktok).toBe(expected);
  });
  it('keeps missing metrics pending; followers and peaks cannot qualify', () => {
    expect(qualifyCreator({}).category).toBe('pending');
    expect(qualifyCreator({ socials: [{ platform: 'twitch', url: 'https://twitch.tv/test', followers: 100000 }] }).main).toBeNull();
    expect(IntakeProfile.safeParse({ averageViewers: { value: 100, source: 'declared' } }).success).toBe(false);
  });
  it('allows both lanes without discarding one', () => {
    expect(qualifyCreator({ ...base, tiktokLive: true, tiktokBattles: true, tiktokAverageViewers: metric(31) }).category).toBe('both');
  });
  it('keeps other creators for personal review', () => {
    const decision = decideIntake({ ...base, averageViewers: metric(20) }, intake);
    expect(decision.qualification.category).toBe('other');
    expect(decision.state).toBe('waiting_human');
  });
  it('does not invent a zero for a creator without streams', () => {
    expect(qualifyCreator({ doesStream: false, tiktokLive: false }).category).toBe('other');
  });
  it('hands off immediately on request, uncertainty and minority', () => {
    expect(decideIntake({}, { ...intake, intent: 'human' }).state).toBe('waiting_human');
    expect(decideIntake({}, null).state).toBe('waiting_human');
    expect(decideIntake({ adult: false }, intake).reason).toBe('age_review');
  });
  it('honours explicit stop without a model or a reply', () => {
    const extraction = explicitIntakeIntent('Por favor, no me escribas más');
    expect(decideIntake(base, extraction)).toMatchObject({ state: 'closed', reply: null });
  });
  it('requires evidence and rejects verified values, negative counts and unsafe URLs', () => {
    expect(validateExtraction({ ...intake, profile: { name: 'Invented' } }, 'Hola')).toBeNull();
    expect(validateExtraction({ ...intake, profile: { name: 'TEST' }, evidence: { name: 'Me llamo TEST' } }, 'Me llamo TEST')?.profile.name).toBe('TEST');
    expect(IntakeProfile.safeParse({ averageViewers: { value: 100, periodDays: 30, source: 'verified' } }).success).toBe(false);
    expect(IntakeProfile.safeParse({ focusPercent: 101 }).success).toBe(false);
    expect(IntakeProfile.safeParse({ averageViewers: metric(-1) }).success).toBe(false);
    expect(IntakeProfile.safeParse({ socials: [{ platform: 'other', url: 'javascript:alert(1)' }] }).success).toBe(false);
  });
  it('explains criteria when asked instead of improvising thresholds', () => {
    const result = decideIntake({}, { ...intake, intent: 'criteria' });
    expect(result.reply).toContain('100 espectadores');
    expect(result.reply).toContain('más de 30');
    expect(result.reply).toContain('otras marcas');
    expect(result.state).toBe('bot');
  });
});

describe('Telegram professional account boundaries', () => {
  const now = new Date('2026-09-08T12:00:00.000Z');
  const config = { connection: 'TEST-connection', owner: '999', chats: ['123'], startAt: '2026-09-08T11:00:00.000Z', now };
  const message = { message_id: 1, business_connection_id: config.connection, date: now.getTime() / 1000,
    from: { id: 123 }, chat: { id: 123, type: 'private' }, text: 'Hola TEST' };
  it('accepts fresh creator messages and detects human replies', () => {
    expect(normalizeTelegramIntake({ update_id: 1, business_message: message }, config)?.actor).toBe('creator');
    expect(normalizeTelegramIntake({ update_id: 2, business_message: { ...message, from: { id: 999 } } }, config)?.actor).toBe('owner');
  });
  it('ignores no message, bots, groups, wrong accounts, unlisted chats and history', () => {
    expect(normalizeTelegramIntake({ update_id: 1 }, config)).toBeNull();
    for (const changed of [
      { ...message, sender_business_bot: { id: 777 } }, { ...message, from: { id: 123, is_bot: true } },
      { ...message, chat: { id: 123, type: 'group' } }, { ...message, business_connection_id: 'another-account' },
      { ...message, chat: { id: 456, type: 'private' } }, { ...message, date: message.date - 600 },
      { ...message, date: message.date + 120 }, { ...message, from: { id: 456 } },
    ]) expect(normalizeTelegramIntake({ update_id: 1, business_message: changed }, config)).toBeNull();
  });
  it('uses message identity even if update envelope changes', () => {
    expect(normalizeTelegramIntake({ update_id: 1, business_message: message }, config)?.externalId)
      .toBe(normalizeTelegramIntake({ update_id: 2, business_message: message }, config)?.externalId);
  });
});
