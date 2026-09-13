import { decideIntake, validateExtraction } from '@/lib/intake/decision';
import { INTAKE_KNOWLEDGE, INTAKE_KNOWLEDGE_PROMPT } from '@/lib/intake/knowledge';
import { IntakeKnowledgeTopic } from '@/lib/schemas/intakeKnowledge';
import type { IntakeExtraction } from '@/lib/schemas/creatorIntake';

const request: IntakeExtraction = { profile: {}, evidence: {}, intent: 'knowledge',
  topics: ['creator_services', 'youtube'], topicEvidence: { creator_services: '¿Qué ofrecéis?', youtube: '¿Gestionáis YouTube?' } };

describe('approved SocialPro knowledge', () => {
  it('answers relevant agency questions before continuing intake', () => {
    const result = decideIntake({}, request);
    expect(result.reply).toContain('representación');
    expect(result.reply).toContain('gestión de canales de YouTube');
    expect(result.reply).toContain('¿Te interesa');
    expect(result.state).toBe('bot');
    expect(result.profile).toEqual({});
  });
  it('requires the actual question as evidence and rejects invented topics/answers', () => {
    expect(validateExtraction(request, '¿Qué ofrecéis? ¿Gestionáis YouTube?')).not.toBeNull();
    expect(validateExtraction(request, 'hola')).toBeNull();
    expect(validateExtraction({ ...request, topics: ['bank_credentials'] }, 'hola')).toBeNull();
    expect(validateExtraction({ ...request, topics: [], answer: 'Garantizamos 5000 €' }, 'hola')).toBeNull();
    expect(validateExtraction({ ...request, topics: [] }, 'hola')).toBeNull();
  });
  it.each(['conditions', 'brand_brief', 'compliance'] as const)('hands off %s even if the model chooses knowledge', (topic) => {
    const result = decideIntake({}, { ...request, topics: [topic] });
    expect(result.state).toBe('waiting_human');
    expect(result.reply).not.toContain('¿Cómo te llamas');
    expect(result.reply).not.toContain('¿En qué plataforma haces directos');
  });
  it('answers questions while the creator is gathering statistics', () => {
    const result = decideIntake({ name: 'TEST', country: 'España', adult: true, goal: 'Colaboraciones', interested: true,
      gamblingPreferences: { casinos: 'no', sportsBetting: 'no', cs2Gambling: 'no' }, metricsRequested: true,
      socials: [{ platform: 'youtube', url: 'https://youtube.com/@test' }], tiktokLive: false, doesStream: false }, request);
    expect(result.reply).toContain('gestión de canales de YouTube');
    expect(result.state).toBe('bot');
  });
  it('keeps stop, personal attention and uncertainty ahead of knowledge', () => {
    expect(decideIntake({}, { ...request, intent: 'stop' }).reply).toBeNull();
    for (const intent of ['human', 'uncertain', 'upset'] as const) {
      const result = decideIntake({}, { ...request, intent });
      expect(result.state).toBe('waiting_human');
      expect(result.reply).not.toContain('gestión de canales de YouTube');
    }
  });
  it('has a unique sourced entry per allowed topic and fits the existing bounded input', () => {
    expect(new Set(INTAKE_KNOWLEDGE.map((entry) => entry.topic)).size).toBe(IntakeKnowledgeTopic.options.length);
    expect(INTAKE_KNOWLEDGE.every((entry) => entry.source && entry.answer)).toBe(true);
    expect(Buffer.byteLength(INTAKE_KNOWLEDGE_PROMPT, 'utf8')).toBeLessThan(12000);
  });
  it('keeps TikTok independent and does not infer current brand availability', () => {
    expect(decideIntake({}, { ...request, topics: ['tiktok_fit'] }).reply).toContain('más de 30');
    expect(decideIntake({}, { ...request, topics: ['tiktok_fit'] }).reply).toContain('aunque no hagan CS2');
    expect(decideIntake({}, { ...request, topics: ['portfolio'] }).reply).toContain('no significa que tenga una oferta abierta');
  });
});
