import { z } from 'zod';
import { creatorObservationSchema, type CreatorObservation } from '@/lib/schemas/creator-search-profile';
import type { Target } from '@/types';

export type TargetView = Omit<Target, 'fitScore'> & {
  fitScore: number | null;
  metricAvailability: 'current' | 'unavailable' | 'untracked';
};
export type RetainedFields = Readonly<Record<string, CreatorObservation>>;
export type RetentionEvidence = Readonly<{
  fields: Readonly<Record<string, unknown>>;
  expiresAt: Date | null;
  retentionDays: number | null;
}>;

/** Clamp to the original observation, never synced_at. A legacy account deadline can only shorten it. */
export function retainObservation(raw: unknown, retentionDays: number | null, now: Date,
  legacyExpiresAt: Date | null = null): CreatorObservation | null {
  const parsed = creatorObservationSchema.safeParse(raw);
  if (!parsed.success || !Number.isSafeInteger(retentionDays) || retentionDays === null || retentionDays <= 0) return null;
  const value = parsed.data;
  if (value.value === null || value.observed_at === null) return null;
  const observed = Date.parse(value.observed_at), synced = Date.parse(value.synced_at);
  if (observed > now.getTime() || observed > synced || synced > now.getTime()) return null;
  const deadline = Math.min(observed + retentionDays * 86_400_000,
    value.expires_at ? Date.parse(value.expires_at) : legacyExpiresAt?.getTime() ?? Infinity);
  if (!Number.isFinite(deadline) || deadline <= now.getTime()) return null;
  return { ...value, expires_at: new Date(deadline).toISOString(), retention_days: retentionDays };
}

export function retainCreatorFields(evidence: RetentionEvidence, now: Date): Record<string, CreatorObservation> {
  const entries = Object.entries(evidence.fields).flatMap(([key, value]) => {
    const retained = retainObservation(value, evidence.retentionDays, now, evidence.expiresAt);
    return retained ? [[key, retained] as const] : [];
  });
  return Object.fromEntries(entries);
}

/** Earliest field deadline makes the existing indexed/account marker useful for bounded maintenance. */
export function nextCreatorExpiry(fields: RetainedFields): Date | null {
  const times = Object.values(fields).flatMap((field) => field.expires_at ? [Date.parse(field.expires_at)] : []);
  return times.length ? new Date(Math.min(...times)) : null;
}

function numberField(fields: RetainedFields, key: string): number | null {
  const value = fields[key]?.value;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function scoreField(fields: RetainedFields): number | null {
  const score = numberField(fields, 'fitScore');
  return score !== null && score <= 100 ? score : null;
}
function textField(fields: RetainedFields, key: string): string | null {
  const value = fields[key]?.value;
  return typeof value === 'string' ? value : null;
}
function dateField(fields: RetainedFields, key: string): Date | null {
  const text = textField(fields, key);
  if (!text) return null;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** All provider-owned mirrors are projections. Manual identity, contact and workflow fields are absent here. */
export function creatorMetricMirrors(fields: RetainedFields, existingQualification?: string) {
  const score = scoreField(fields);
  const qualification = [existingQualification, textField(fields, 'qualificationStatus')]
    .find(value => value === 'qualified' || value === 'review' || value === 'rejected') ?? 'review';
  const rawReasons = textField(fields, 'fitReasons');
  let fitReasons: string[] = [];
  if (score !== null && rawReasons) {
    try { const parsed = z.array(z.string()).safeParse(JSON.parse(rawReasons)); if (parsed.success) fitReasons = parsed.data; }
    catch { /* Invalid stored payload is unavailable, never rendered verbatim. */ }
  }
  return {
    followers: numberField(fields, 'followers'), following: numberField(fields, 'following'),
    posts: numberField(fields, 'channelVideoCount'), bio: textField(fields, 'publicBio'),
    profilePicUrl: textField(fields, 'avatar'), countryCode: textField(fields, 'country'),
    defaultLanguage: textField(fields, 'language'), lastVideoAt: dateField(fields, 'lastVideoPublishedAt'),
    recentVideoCount: numberField(fields, 'recentVideoCount'), minRecentVideoViews: numberField(fields, 'minRecentVideoViews'),
    avgRecentVideoViews: numberField(fields, 'avgRecentVideoViews'), recentVideosWindowDays: numberField(fields, 'recentWindowDays'),
    lastActivityAt: dateField(fields, 'lastVideoPublishedAt') ?? dateField(fields, 'streamStartedAt'),
    qualificationUpdatedAt: score === null ? null : new Date(fields.fitScore?.observed_at ?? ''),
    qualificationStatus: score === null ? 'unavailable' : qualification,
    // The legacy DB column is NOT NULL. This placeholder is NEVER exposed as a measured score.
    fitScore: score ?? 0, fitReasons,
    isPrivate: null, isVerified: null, isBusiness: null, isCreator: null, businessCategory: null,
  };
}

export function projectCreatorTarget(target: Target, evidence: RetentionEvidence | undefined, now: Date): TargetView {
  if (!evidence) return { ...target, fitScore: target.qualificationStatus === 'unavailable' ? null : target.fitScore,
    metricAvailability: 'untracked' };
  const fields = retainCreatorFields(evidence, now), mirrors = creatorMetricMirrors(fields, target.qualificationStatus);
  const hasMetrics = ['followers', 'following', 'channelVideoCount', 'currentViewers', 'recentVideoCount', 'fitScore']
    .some(key => key === 'fitScore' ? scoreField(fields) !== null : numberField(fields, key) !== null);
  return { ...target, ...mirrors, fitScore: scoreField(fields), metricAvailability: hasMetrics ? 'current' : 'unavailable' };
}
