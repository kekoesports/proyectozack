import { IntakeExtraction, type IntakeProfile } from '@/lib/schemas/creatorIntake';
import { nextIntakeQuestion, qualifyCreator } from './qualification';
import { intakeKnowledgeAnswer, knowledgeRequiresHuman } from './knowledge';
import type { IntakeKnowledgeTopic } from '@/lib/schemas/intakeKnowledge';
import { isIntakeMetricsRequest } from './metrics-request';

export function validateExtraction(raw: unknown, text: string): IntakeExtraction | null {
  const parsed = IntakeExtraction.safeParse(raw);
  if (!parsed.success) return null;
  // Require a literal supporting passage for each changed field. This is
  // provenance, not metric verification; the UI always labels it declared.
  for (const key of Object.keys(parsed.data.profile)) {
    const quote = parsed.data.evidence[key];
    if (!quote || !text.includes(quote)) return null;
  }
  for (const topic of parsed.data.topics ?? []) {
    const quote = parsed.data.topicEvidence?.[topic];
    if (!quote || !text.includes(quote)) return null;
  }
  if (parsed.data.intent === 'knowledge' && !parsed.data.topics?.length) return null;
  return parsed.data;
}

export function decideIntake(profile: IntakeProfile, extraction: IntakeExtraction | null) {
  const updated: IntakeProfile = { ...profile, ...extraction?.profile };
  if (extraction?.profile.gamblingPreferences) updated.gamblingPreferences = { ...profile.gamblingPreferences, ...extraction.profile.gamblingPreferences };
  if (extraction?.profile.instagramMetrics) updated.instagramMetrics = { ...profile.instagramMetrics, ...extraction.profile.instagramMetrics };
  if (extraction?.profile.socials) {
    const socials = new Map(profile.socials?.map((s) => [`${s.platform}:${s.url}`, s]));
    for (const social of extraction.profile.socials) socials.set(`${social.platform}:${social.url}`, social);
    updated.socials = [...socials.values()].slice(-12);
  }
  const qualification = qualifyCreator(updated);
  if (extraction?.intent === 'stop') {
    return { profile: updated, qualification, state: 'closed' as const, reason: 'stop_requested', reply: null };
  }
  if (updated.interested === false) {
    return { profile: updated, qualification, state: 'closed' as const, reason: 'not_interested', reply: null };
  }
  const topics: readonly IntakeKnowledgeTopic[] = updated.contactType === 'brand' ? ['brand_brief'] : extraction?.topics?.length ? extraction.topics
    : extraction?.intent === 'criteria' ? ['main_fit', 'tiktok_fit']
      : extraction?.intent === 'agency' ? ['agency'] : [];
  const explanation = extraction && !['human', 'upset', 'uncertain'].includes(extraction.intent)
    ? intakeKnowledgeAnswer(topics) : '';
  const escalation = !extraction || !['intake', 'criteria', 'agency', 'knowledge'].includes(extraction.intent)
    || updated.adult === false || knowledgeRequiresHuman(topics)
    || (extraction.intent === 'knowledge' && !topics.length);
  const question = nextIntakeQuestion(updated);
  if (!escalation && isIntakeMetricsRequest(question ?? undefined)) updated.metricsRequested = true;
  if (!escalation && !question && explanation && updated.metricsRequested) {
    return { profile: updated, qualification, state: 'bot' as const, reason: null, reply: explanation };
  }
  if (escalation || !question) {
    return {
      profile: updated, qualification, state: 'waiting_human' as const,
      reason: !extraction ? 'extraction_failed' : updated.adult === false ? 'age_review'
        : escalation ? extraction.intent : 'metrics_review',
      reply: [explanation, 'Gracias. Un compañero de SocialPro continuará contigo por aquí para revisar tu consulta.'].filter(Boolean).join('\n\n'),
    };
  }
  return { profile: updated, qualification, state: 'bot' as const, reason: null,
    reply: [explanation, question].filter(Boolean).join('\n\n') };
}

export function explicitIntakeIntent(text: string): IntakeExtraction | null {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(no me (escribas|contactes)|deja de (escribirme|contactarme)|darme de baja|no quiero (mas mensajes|que me escribas))\b/.test(normalized)) {
    return { profile: {}, evidence: {}, intent: 'stop' };
  }
  if (/\b(hablar con (una persona|un humano|keko)|pasame con (una persona|keko))\b/.test(normalized)) {
    return { profile: {}, evidence: {}, intent: 'human' };
  }
  return null;
}
