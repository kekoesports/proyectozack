import { creatorProviderPermissions, automationRegistry } from '@/db/schema';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { creatorProviderGate, type CreatorProviderGate } from '@/lib/targets/provider-readiness';
import type { CreatorPlatform } from '@/lib/schemas/creator-search-profile';

export async function getCreatorProviderReadiness(): Promise<CreatorProviderGate[]> {
  const permissions = await db.select().from(creatorProviderPermissions);
  const byPlatform = new Map(permissions.map((row) => [row.platform, row]));
  const credentials: Record<CreatorPlatform, boolean> = {
    youtube: !!env.YOUTUBE_API_KEY,
    twitch: !!env.TWITCH_CLIENT_ID && !!env.TWITCH_CLIENT_SECRET,
    kick: !!env.KICK_CLIENT_ID && !!env.KICK_CLIENT_SECRET,
    instagram: !!env.INSTAGRAM_BUSINESS_ACCOUNT_ID && !!env.META_INSTAGRAM_ACCESS_TOKEN && !!env.META_GRAPH_API_VERSION,
  };
  const platforms: CreatorPlatform[] = ['youtube', 'twitch', 'kick', 'instagram'];
  return platforms.map((platform) => creatorProviderGate(platform, credentials[platform], byPlatform.get(platform), new Date()));
}

export async function recordCreatorPreflight(gates: readonly CreatorProviderGate[]): Promise<void> {
  for (const gate of gates) {
    const state = { status: gate.ready ? 'NEVER_RUN' : 'PAUSED', enabled: gate.ready,
      evidence: gate.message, observedAt: new Date(), updatedAt: new Date() } as const;
    await db.insert(automationRegistry).values({ key: `creator:${gate.platform}`, name: `${gate.platform} Discovery`,
      type: 'discovery', purpose: 'Descubrimiento interno de creadores; sin contacto automático.', version: 'creator-discovery-2026-09-05', ...state })
      .onConflictDoUpdate({ target: automationRegistry.key, set: gate.ready
        ? { enabled: true, evidence: gate.message, observedAt: state.observedAt, updatedAt: state.updatedAt }
        : state });
  }
}
