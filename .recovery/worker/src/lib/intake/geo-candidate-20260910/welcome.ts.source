import type { IntakeExtraction } from '@/lib/schemas/creatorIntake';
import { intakeMetricsRequest, isIntakeMetricsRequest } from './metrics-request';

export const INTAKE_INTEREST_QUESTION = '¿Te interesa que valoremos tu perfil para colaborar? Si nos escribes en nombre de una marca, dímelo y te orientamos por esa vía.';
export const INTAKE_INTRO = '¡Hola! Soy el asistente virtual de SocialPro 👋\n\nSomos una agencia especializada en creadores de gaming, esports, CS2, iGaming y TikTok LIVE. Si eres streamer o creador de Instagram, TikTok o YouTube, envíanos tus redes y estadísticas de los últimos 30 días para valorar posibles colaboraciones.\n\nPrivacidad: https://socialpro.es/privacidad\n\n';
export const INTAKE_METRICS_QUESTION = intakeMetricsRequest({});

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,:;]/g, '').trim();
}

/** Exact common replies only; richer messages still use evidence-based extraction. */
export function intakeSimpleReply(text: string, previous?: string): IntakeExtraction | null {
  const value = normalize(text);
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches)$/.test(value)
    || value === 'hola me interesa conocer mas sobre socialpro'
    || value === 'me gustaria saber mas sobre socialpro'
    || value === 'hola vengo de vuestra web y me gustaria saber como trabajar con socialpro') {
    return { profile: {}, evidence: {}, intent: 'intake' };
  }
  if (previous?.includes(INTAKE_INTEREST_QUESTION) || previous === INTAKE_INTRO.trimEnd()) {
    if (/^(si|si me interesa|me interesa|claro|si gracias|vale)$/.test(value)) {
      return { profile: { interested: true }, evidence: { interested: text }, intent: 'intake' };
    }
    if (/^(no|no gracias|no me interesa|no estoy interesado|no estoy interesada)$/.test(value)) {
      return { profile: { interested: false }, evidence: { interested: text }, intent: 'intake' };
    }
  }
  if (isIntakeMetricsRequest(previous) && /^(no las tengo( ahora)?|ahora no|no tengo metricas)$/.test(value)) {
    return { profile: {}, evidence: {}, intent: 'intake' };
  }
  return null;
}
