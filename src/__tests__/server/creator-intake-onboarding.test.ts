import { decideIntake, validateExtraction } from '@/lib/intake/decision';
import { nextIntakeQuestion } from '@/lib/intake/qualification';
import { INTAKE_INTEREST_QUESTION, INTAKE_METRICS_QUESTION, intakeSimpleReply } from '@/lib/intake/welcome';
import { intakeMetricsRequest } from '@/lib/intake/metrics-request';
import type { IntakeProfile } from '@/lib/schemas/creatorIntake';

const core: IntakeProfile = { interested: true, name: 'TEST', country: 'España', adult: true,
  socials: [{ platform: 'instagram', url: 'https://instagram.com/test' }],
  gamblingPreferences: { casinos: 'no', sportsBetting: 'no', cs2Gambling: 'discuss' }, tiktokLive: false };
const intake = { profile: {}, evidence: {}, intent: 'intake' as const };
it('explains first and waits for interest before asking active socials', () => {
  expect(nextIntakeQuestion({})).toBe(INTAKE_INTEREST_QUESTION);
  expect(nextIntakeQuestion({ interested: true })).toContain('redes más activas');
  expect(intakeSimpleReply('Hola, me interesa conocer más sobre SocialPro')?.profile).toEqual({});
  expect(intakeSimpleReply('sí', INTAKE_INTEREST_QUESTION)?.profile.interested).toBe(true);
  expect(intakeSimpleReply('sí', '¿Haces batallas?')).toBeNull();
});
it('does not pursue profiles that decline and routes brands to a commercial brief', () => {
  expect(decideIntake({}, intakeSimpleReply('no gracias', INTAKE_INTEREST_QUESTION)))
    .toMatchObject({ state: 'closed', reason: 'not_interested', reply: null });
  const brand = decideIntake({ contactType: 'brand' }, intake);
  expect(brand.state).toBe('waiting_human'); expect(brand.reply).toContain('marca o web');
  expect(brand.reply).not.toContain('redes más activas');
});
it('keeps category preferences separate and preserves answers across messages', () => {
  const result = decideIntake({ ...core, gamblingPreferences: { casinos: 'no' } }, {
    profile: { gamblingPreferences: { sportsBetting: 'discuss' } }, evidence: {}, intent: 'intake',
  });
  expect(result.profile.gamblingPreferences).toEqual({ casinos: 'no', sportsBetting: 'discuss' });
  expect(result.reply).toContain('Instagram');
  expect(result.reply).not.toContain('casinos');
  expect(result.reply).not.toContain('casas de apuestas');
});
it('goes straight from socials to statistics without asking personal details', () => {
  const result = decideIntake({ interested: true, socials: core.socials }, {
    profile: { name: 'TEST', adult: true }, evidence: {}, intent: 'intake',
  });
  expect(result.profile.adult).toBe(true);
  expect(result.reply).toBe(intakeMetricsRequest(result.profile));
  expect(result.reply).not.toContain('edad');
  expect(result.reply).not.toContain('resides');
  const continued = decideIntake(result.profile, {
    profile: { country: 'España' }, evidence: {}, intent: 'intake',
  });
  expect(continued.profile.adult).toBe(true);
  expect(continued.state).toBe('waiting_human');
  expect(continued.reply).not.toContain('edad');
});
it('does not require personal data or a separate interest confirmation after socials', () => {
  expect(nextIntakeQuestion({ socials: core.socials })).toBe(intakeMetricsRequest(core));
  expect(nextIntakeQuestion({ ...core, country: undefined, adult: undefined }))
    .toBe(intakeMetricsRequest(core));
  expect(decideIntake({ ...core, adult: false }, intake).reason).toBe('age_review');
});
it('requests only analytics relevant to the supplied platforms', () => {
  const reply = nextIntakeQuestion({ socials: [
    { platform: 'twitch', url: 'https://twitch.tv/test' },
    { platform: 'kick', url: 'https://kick.com/test' },
    { platform: 'instagram', url: 'https://instagram.com/test' },
  ] });
  expect(reply).toContain('Twitch: stats de los últimos 30 días y GEO stats.');
  expect(reply).toContain('Kick: stats de los últimos 30 días y GEO stats.');
  expect(reply).toContain('visualizaciones de historias y reels');
  expect(reply).toContain('últimos 30 días');
  expect(reply).not.toContain('YouTube');
  expect(reply).not.toContain('batallas');
});
it('requests statistics once and hands off missing data without claiming completeness', () => {
  const offered = decideIntake(core, intake);
  expect(offered.reply).toBe(intakeMetricsRequest(core)); expect(offered.profile.metricsRequested).toBe(true);
  const done = decideIntake(offered.profile, intakeSimpleReply('no las tengo ahora', INTAKE_METRICS_QUESTION));
  expect(done).toMatchObject({ state: 'waiting_human', reason: 'metrics_review' });
  expect(done.profile.averageViewers).toBeUndefined(); expect(done.qualification.category).toBe('pending');
  expect(validateExtraction({ ...intake, profile: { metricsRequested: true } }, 'no')).toBeNull();
});
