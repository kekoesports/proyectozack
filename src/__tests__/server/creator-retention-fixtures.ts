import type { Target } from '@/types';
import type { CreatorObservation } from '@/lib/schemas/creator-search-profile';

export const NOW = new Date('2026-09-05T12:00:00.000Z');
export const BEFORE = new Date('2026-09-04T12:00:00.000Z');
export function observed(value: CreatorObservation['value'], at = BEFORE, overrides: Partial<CreatorObservation> = {}): CreatorObservation {
  return { value, source: 'official:youtube:test', observed_at: value === null ? null : at.toISOString(),
    synced_at: at.toISOString(), status: value === null ? 'unavailable' : 'available', confidence: 'HIGH', ...overrides };
}
export function targetFixture(): Target {
  return {
    id: 1, username: 'synthetic-creator', fullName: 'Synthetic identity', platform: 'youtube',
    profileUrl: 'https://example.invalid/synthetic-creator', profilePicUrl: 'https://example.invalid/avatar',
    followers: 1234, following: 12, posts: 12, bio: 'Synthetic public bio', externalUrl: 'https://manual.example.invalid',
    countryCode: 'ES', defaultLanguage: 'es', lastVideoAt: BEFORE, recentVideoCount: 5,
    minRecentVideoViews: 800, avgRecentVideoViews: 1600, recentVideosWindowDays: 90,
    qualificationUpdatedAt: BEFORE, complianceActivity: null, complianceStatus: 'manual-review',
    complianceSourceUrl: null, complianceCheckedAt: null, contactEmail: 'manual@example.invalid', contactUrl: null,
    qualificationStatus: 'review', fitScore: 75, fitReasons: ['Old synthetic metric reason'], sourceQuery: 'CS2',
    lastActivityAt: BEFORE, lastDiscoveredAt: BEFORE, isPrivate: null, isVerified: null,
    isBusiness: null, isCreator: null, businessCategory: null, brandUserId: 'synthetic-brand', notes: 'Manual history stays',
    status: 'contactado', discoveredVia: 'profile:youtube:CS2', importBatchId: null, enrichedAt: BEFORE,
    contactedAt: BEFORE, createdAt: BEFORE, updatedAt: BEFORE,
  };
}
