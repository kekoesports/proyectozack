import 'server-only';

import { createHash } from 'node:crypto';

import { env } from '@/lib/env';
import { sendCreatorOutreach } from '@/lib/email/creatorOutreach';
import { queueCreatorOutreachReview, recordCreatorOutreachQualification } from '@/lib/queries/creatorOutreach';
import { getRecentLiveAudienceSamplesByExternalIds } from '@/lib/queries/creatorLiveAudienceSamples';
import type { InboundCreatorApplication } from '@/lib/queries/inboundCreatorApplications';
import { getKickChannel } from '@/lib/services/kick';
import { getTwitchChannelInfo, searchTwitchChannels } from '@/lib/services/twitch';
import { getChannelDetails, getChannelRecentPerformance, searchYouTubeChannels } from '@/lib/services/youtube';
import { hasMinimumCreatorFollowers } from '@/lib/targets/audience-thresholds';
import { summarizeLiveAudience } from '@/lib/targets/live-audience-samples';
import { normalizeSocialProfileUrl, normalizeTwitchLogin } from '@/lib/utils/social-profile-url';

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

function platformIdentity(application: InboundCreatorApplication, platform: 'twitch' | 'kick'): string | null {
  const candidates = [application.declaredHandle, ...(application.otherLinks ?? '').split(/[\s,;]+/)]
    .map(value => value.trim()).filter(Boolean);
  const profileUrl = candidates.map(value => normalizeSocialProfileUrl({
    platform, profileUrl: value, handle: value,
  })).find((value): value is string => value !== null);
  if (platform === 'twitch') {
    return normalizeTwitchLogin(profileUrl ?? application.declaredHandle);
  }
  const candidate = profileUrl
    ? new URL(profileUrl).pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
    : application.declaredHandle.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_-]{1,25}$/.test(candidate) ? candidate : null;
}

function inferPlatformFromUrls(values: readonly string[]): 'youtube' | 'twitch' | 'kick' | null {
  for (const value of values.flatMap(item => item.split(/[\s,;]+/)).map(item => item.trim()).filter(Boolean)) {
    if (normalizeSocialProfileUrl({ platform: 'youtube', profileUrl: value })) return 'youtube';
    if (normalizeSocialProfileUrl({ platform: 'twitch', profileUrl: value })) return 'twitch';
    if (normalizeSocialProfileUrl({ platform: 'kick', profileUrl: value })) return 'kick';
  }
  return null;
}

async function qualifyTwitchApplication(application: InboundCreatorApplication, now: Date): Promise<CreatorQualification> {
  const login = platformIdentity(application, 'twitch');
  if (!login) return { decision: 'yellow', reason: 'Falta una identidad inequívoca del canal de Twitch.' };
  const search = await searchTwitchChannels(login, false);
  const exact = search.find(channel => channel.login.toLowerCase() === login.toLowerCase());
  if (!exact) return { decision: 'yellow', reason: 'No se pudo confirmar de forma inequívoca el canal de Twitch.' };
  const [channel] = await getTwitchChannelInfo([exact.broadcasterId]);
  if (!channel || channel.followerCount === null) {
    return { decision: 'yellow', reason: 'No se pudo verificar el total de seguidores de Twitch.' };
  }
  if (!hasMinimumCreatorFollowers('twitch', channel.followerCount)) {
    return { decision: 'red', reason: `${channel.followerCount.toLocaleString('es-ES')} seguidores: no supera el mínimo de 10.000 en Twitch.` };
  }
  const samples = await getRecentLiveAudienceSamplesByExternalIds('twitch', [channel.broadcasterId], now);
  const summary = summarizeLiveAudience(samples.get(channel.broadcasterId) ?? []);
  if (summary.averageViewers === null || summary.cs2ContentShare === null) {
    return { decision: 'yellow', reason: `Twitch supera 10.000 seguidores, pero faltan observaciones nuevas para completar al menos ${summary.measuredMinutes}/60 minutos medidos.` };
  }
  const failures = [
    summary.averageViewers < 80 ? `media de ${summary.averageViewers} espectadores, inferior a 80` : null,
    summary.cs2ContentShare < 0.3 ? `${Math.round(summary.cs2ContentShare * 100)}% de contenido CS2, inferior al 30%` : null,
  ].filter((value): value is string => value !== null);
  return failures.length > 0
    ? { decision: 'red', reason: failures.join('; ') }
    : { decision: 'green', reason: `${channel.followerCount.toLocaleString('es-ES')} seguidores, media ${summary.averageViewers} y ${Math.round(summary.cs2ContentShare * 100)}% de CS2; cualquier idioma admitido.` };
}

async function qualifyKickApplication(application: InboundCreatorApplication): Promise<CreatorQualification> {
  const slug = platformIdentity(application, 'kick');
  if (!slug) return { decision: 'yellow', reason: 'Falta una identidad inequívoca del canal de Kick.' };
  const channel = await getKickChannel(slug);
  if (!channel) return { decision: 'yellow', reason: 'No se pudo confirmar el canal de Kick.' };
  if (channel.followers === null) {
    return { decision: 'yellow', reason: 'La API oficial de Kick no facilita seguidores; hay que verificar manualmente que supere 2.000.' };
  }
  return hasMinimumCreatorFollowers('kick', channel.followers)
    ? { decision: 'green', reason: `${channel.followers.toLocaleString('es-ES')} seguidores: supera 2.000 en Kick.` }
    : { decision: 'red', reason: `${channel.followers.toLocaleString('es-ES')} seguidores: no supera 2.000 en Kick.` };
}

export async function qualifyCreatorApplication(
  application: InboundCreatorApplication,
  now = new Date(),
): Promise<CreatorQualification> {
  const platform = application.declaredPlatform.trim().toLowerCase();
  const declaredNetwork = platform.includes('youtube') ? 'youtube'
    : platform.includes('twitch') ? 'twitch'
      : platform.includes('kick') ? 'kick' : null;
  const inferredNetwork = inferPlatformFromUrls([
    application.declaredHandle, application.otherLinks ?? '',
  ]);
  const selectedNetwork = declaredNetwork ?? inferredNetwork;
  const isYouTube = selectedNetwork === 'youtube';
  const isTwitch = selectedNetwork === 'twitch';
  const isKick = selectedNetwork === 'kick';

  if (isTwitch) return qualifyTwitchApplication(application, now);
  if (isKick) return qualifyKickApplication(application);

  if (!isYouTube) {
    return {
      decision: 'yellow',
      reason: 'La red o las métricas verificables no permiten una decisión automática segura.',
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

export function creatorOutreachStableUuid(value: string): string {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sourceForCreatorApplication(application: InboundCreatorApplication): {
  readonly sourceType: 'creator_application' | 'contact_submission' | 'target';
  readonly sourceId: number;
} | null {
  const [sourceTypeValue, sourceIdValue] = application.sourceId.split(':', 2);
  const sourceId = Number(sourceIdValue);
  const sourceType = sourceTypeValue === 'creator' ? 'creator_application'
    : sourceTypeValue === 'lead' ? 'contact_submission'
      : sourceTypeValue === 'target' ? 'target'
        : null;
  return sourceType && Number.isInteger(sourceId) && sourceId > 0 ? { sourceType, sourceId } : null;
}

export function creatorOutreachMessageFor(application: InboundCreatorApplication, decision: 'green' | 'red'): { readonly subject: string; readonly body: string } {
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
    const source = sourceForCreatorApplication(application);
    if (!source) {
      errors += 1;
      continue;
    }
    let qualification: CreatorQualification;
    try {
      qualification = await qualifyCreatorApplication(application);
    } catch (error) {
      // Una API externa caída o sin cuota no es motivo para rechazar ni para
      // contactar automáticamente: la candidatura queda para revisión humana.
      const reason = error instanceof Error ? error.message : 'unknown-error';
      console.warn('[creator-outreach] qualification deferred', { sourceId: application.sourceId, reason });
      try {
        await queueCreatorOutreachReview({ ...source, reason: `Verificación externa pendiente: ${reason}` });
        yellowReview += 1;
      } catch {
        errors += 1;
      }
      continue;
    }
    if (qualification.decision === 'yellow') {
      try {
        await queueCreatorOutreachReview({ ...source, reason: qualification.reason });
        yellowReview += 1;
      } catch {
        errors += 1;
      }
      continue;
    }
    try {
      await recordCreatorOutreachQualification({ ...source, ...qualification });
      const content = creatorOutreachMessageFor(application, qualification.decision);
      const result = await sendCreatorOutreach({
        ...source,
        ...content,
        idempotencyKey: creatorOutreachStableUuid(`creator-intake:${application.sourceId}:${qualification.decision}:v1`),
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
