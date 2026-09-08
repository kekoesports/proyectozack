import 'server-only';

import { createHash } from 'node:crypto';

import { env } from '@/lib/env';
import { sendCreatorOutreach } from '@/lib/email/creatorOutreach';
import type { InboundCreatorApplication } from '@/lib/queries/inboundCreatorApplications';
import { getChannelDetails, getChannelRecentPerformance, searchYouTubeChannels } from '@/lib/services/youtube';

export type CreatorTrafficLight = 'green' | 'yellow' | 'red';

export type CreatorQualification = {
  readonly decision: CreatorTrafficLight;
  readonly reason: string;
};

const YOUTUBE_WINDOW_DAYS = 90;
const MIN_YOUTUBE_SUBSCRIBERS = 3_000;
const MIN_YOUTUBE_LONG_VIDEOS = 3;
const MIN_YOUTUBE_MEDIAN_VIEWS = 1_000;
const MAX_YOUTUBE_INACTIVE_DAYS = 30;

function extractYouTubeIdentity(application: InboundCreatorApplication): { readonly channelId: string | null; readonly query: string } {
  const input = `${application.declaredHandle}\n${application.otherLinks ?? ''}`;
  const channelId = input.match(/(?:youtube\.com\/channel\/|\b)(UC[A-Za-z0-9_-]{22})(?:\b|\/)/)?.[1] ?? null;
  const handle = input.match(/youtube\.com\/@([A-Za-z0-9._-]+)/i)?.[1]
    ?? input.match(/@([A-Za-z0-9._-]+)/)?.[1]
    ?? application.declaredHandle.trim();
  return { channelId, query: handle };
}

function identityKey(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]/g, '');
}

export async function qualifyCreatorApplication(
  application: InboundCreatorApplication,
  now = new Date(),
): Promise<CreatorQualification> {
  const platform = application.declaredPlatform.trim().toLowerCase();
  const handle = application.declaredHandle.toLowerCase();
  const links = (application.otherLinks ?? '').toLowerCase();
  const isYouTube = platform.includes('youtube') || handle.includes('youtube.com') || links.includes('youtube.com');

  if (!isYouTube) {
    return {
      decision: 'yellow',
      reason: platform.includes('twitch') || platform.includes('kick')
        ? 'Twitch/Kick requiere una media verificada de CS2 de los últimos 30 días; la API oficial no aporta ese historial.'
        : 'La red o las métricas verificables no permiten una decisión automática segura.',
    };
  }

  const identity = extractYouTubeIdentity(application);
  if (!identity.channelId && identity.query.length < 2) {
    return { decision: 'yellow', reason: 'Falta una identidad inequívoca del canal de YouTube.' };
  }

  const channels = identity.channelId
    ? await getChannelDetails([identity.channelId])
    : await searchYouTubeChannels(identity.query, 5);
  const expected = identityKey(identity.query);
  const channel = identity.channelId
    ? channels[0]
    : channels.find((item) => identityKey(item.handle ?? '') === expected || identityKey(item.title) === expected);
  if (!channel) return { decision: 'yellow', reason: 'No se pudo confirmar de forma inequívoca el canal indicado.' };

  const performance = await getChannelRecentPerformance(channel.channelId, YOUTUBE_WINDOW_DAYS);
  if (channel.subscriberCount === null) {
    return { decision: 'yellow', reason: 'YouTube oculta los suscriptores; hace falta revisión humana.' };
  }

  const daysSinceLastLongVideo = performance.lastVideoAt
    ? Math.max(0, Math.floor((now.getTime() - performance.lastVideoAt.getTime()) / 86_400_000))
    : null;
  if (daysSinceLastLongVideo === null || daysSinceLastLongVideo > MAX_YOUTUBE_INACTIVE_DAYS) {
    return {
      decision: 'yellow',
      reason: 'Sin vídeo largo en los últimos 30 días; requiere revisión humana y los Shorts no cuentan.',
    };
  }
  const failures = [
    channel.subscriberCount < MIN_YOUTUBE_SUBSCRIBERS ? `menos de ${MIN_YOUTUBE_SUBSCRIBERS} suscriptores` : null,
    performance.videoCount < MIN_YOUTUBE_LONG_VIDEOS ? `menos de ${MIN_YOUTUBE_LONG_VIDEOS} vídeos largos en 90 días` : null,
    performance.videoCount > 0 && performance.medianViews < MIN_YOUTUBE_MEDIAN_VIEWS
      ? `mediana inferior a ${MIN_YOUTUBE_MEDIAN_VIEWS} visitas en vídeos largos`
      : null,
  ].filter((value): value is string => value !== null);

  return failures.length > 0
    ? { decision: 'red', reason: failures.join('; ') }
    : { decision: 'green', reason: 'Cumple audiencia, actividad y visitas verificadas; Shorts excluidos.' };
}

function stableUuid(value: string): string {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function messageFor(application: InboundCreatorApplication, decision: 'green' | 'red'): { readonly subject: string; readonly body: string } {
  const firstName = application.name.trim().split(/\s+/, 1)[0] || application.name.trim();
  if (decision === 'green') {
    const bookingUrl = env.CREATOR_OUTREACH_BOOKING_URL;
    if (!bookingUrl) throw new Error('missing-creator-outreach-booking-url');
    return {
      subject: 'Nos gustaría conocerte mejor — SocialPro',
      body: `Hola ${firstName},\n\nGracias por contactar con SocialPro. Hemos revisado tu perfil y nos gustaría conocerte mejor para valorar posibles colaboraciones con marcas.\n\nPuedes elegir el horario que mejor te venga para una llamada de 20 minutos con Alfonso aquí:\n${bookingUrl}\n\nUn saludo,`,
    };
  }
  return {
    subject: 'Gracias por contactar con SocialPro',
    body: `Hola ${firstName},\n\nGracias por escribirnos y compartir tu perfil. Ahora mismo no encaja con los requisitos mínimos de los procesos que tenemos activos.\n\nGuardaremos tus datos en nuestra base de creadores para poder contactarte si en el futuro una campaña de alguna marca encaja con tu perfil.\n\nUn saludo,`,
  };
}

export type CreatorAutomationResult = {
  readonly eligible: number;
  readonly greenSent: number;
  readonly redSent: number;
  readonly yellowReview: number;
  readonly duplicates: number;
  readonly errors: number;
};

export async function processCreatorOutreachAutomation(
  applications: readonly InboundCreatorApplication[],
): Promise<CreatorAutomationResult> {
  const cutoffValue = env.CREATOR_OUTREACH_AUTO_SEND_AFTER;
  if (!env.CREATOR_OUTREACH_AUTO_SEND_ENABLED || !cutoffValue) {
    return { eligible: 0, greenSent: 0, redSent: 0, yellowReview: 0, duplicates: 0, errors: 0 };
  }
  const cutoff = new Date(cutoffValue);
  const eligible = applications.filter((item) => item.createdAt >= cutoff && item.outreachStatus === 'not_contacted');
  let greenSent = 0;
  let redSent = 0;
  let yellowReview = 0;
  let duplicates = 0;
  let errors = 0;

  for (const application of eligible) {
    let qualification: CreatorQualification;
    try {
      qualification = await qualifyCreatorApplication(application);
    } catch (error) {
      // Una API externa caída o sin cuota no es motivo para rechazar ni para
      // contactar automáticamente: la candidatura queda para revisión humana.
      const reason = error instanceof Error ? error.message : 'unknown-error';
      console.warn('[creator-outreach] qualification deferred', { sourceId: application.sourceId, reason });
      yellowReview += 1;
      continue;
    }
    if (qualification.decision === 'yellow') {
      yellowReview += 1;
      continue;
    }
    try {
      const [sourceTypeValue, sourceIdValue] = application.sourceId.split(':', 2);
      const sourceId = Number(sourceIdValue);
      const sourceType = sourceTypeValue === 'creator' ? 'creator_application'
        : sourceTypeValue === 'lead' ? 'contact_submission'
          : sourceTypeValue === 'target' ? 'target'
            : null;
      if (!sourceType || !Number.isInteger(sourceId) || sourceId <= 0) {
        errors += 1;
        continue;
      }
      const content = messageFor(application, qualification.decision);
      const result = await sendCreatorOutreach({
        sourceType,
        sourceId,
        ...content,
        idempotencyKey: stableUuid(`creator-intake:${application.sourceId}:${qualification.decision}:v1`),
      }, null);
      if (result.duplicate) duplicates += 1;
      else if (qualification.decision === 'green') greenSent += 1;
      else redSent += 1;
    } catch {
      errors += 1;
    }
  }
  return { eligible: eligible.length, greenSent, redSent, yellowReview, duplicates, errors };
}
