import { inArray } from 'drizzle-orm';
import { talents } from '@/db/schema';
import { db } from '@/lib/db';
import { getCreatorBinding, listBoundCreatorSlugs } from '@/lib/external-giveaways/creator-bindings';
import type { ExternalGiveawaySections } from '@/lib/external-giveaways/types';
import { absoluteUrl } from '@/lib/site-url';
import { getExternalGiveawaysForCreator } from './externalGiveaways';

export interface KeydropDailyGiveawayReport {
  readonly id: string;
  readonly title: string;
  readonly participantCount: number;
  readonly depositRequired: number;
  readonly depositCurrency: string;
  readonly externalUrl: string;
}

export interface KeydropDailyCreatorReport {
  readonly slug: string;
  readonly displayName: string;
  readonly profileUrl: string;
  readonly status: ExternalGiveawaySections['status'];
  readonly activeGiveawayCount: number;
  /** Suma por sorteo; una misma persona podría aparecer más de una vez. */
  readonly accumulatedParticipants: number;
  readonly giveaways: readonly KeydropDailyGiveawayReport[];
}

/** Consulta todos los bindings KeyDrop en paralelo para el informe diario. */
export async function getKeydropDailyReports(): Promise<KeydropDailyCreatorReport[]> {
  const slugs = listBoundCreatorSlugs().filter(
    (slug) => getCreatorBinding(slug)?.provider === 'keydrop',
  );
  if (slugs.length === 0) return [];

  const talentRows = await db
    .select({ slug: talents.slug, name: talents.name })
    .from(talents)
    .where(inArray(talents.slug, slugs));
  const names = new Map(talentRows.map((talent) => [talent.slug, talent.name]));

  const sections = await Promise.all(
    slugs.map((slug) => getExternalGiveawaysForCreator(slug)),
  );

  return slugs.map((slug, index) => summarizeKeydropCreator({
    slug,
    displayName: names.get(slug) ?? slug.toUpperCase(),
    sections: sections[index] ?? {
      active: [],
      finished: [],
      providerKey: 'keydrop',
      status: 'error',
    },
  }));
}

/** Transformación pura para mantener explícito que solo contamos activos. */
export function summarizeKeydropCreator(input: {
  readonly slug: string;
  readonly displayName: string;
  readonly sections: ExternalGiveawaySections;
}): KeydropDailyCreatorReport {
  const active = input.sections.status === 'ok' ? input.sections.active : [];
  const giveaways = active.map((giveaway) => ({
    id: giveaway.id,
    title: giveaway.title,
    participantCount: giveaway.participantCount,
    depositRequired: giveaway.depositRequired,
    depositCurrency: giveaway.depositCurrency,
    externalUrl: giveaway.externalUrl,
  }));

  return {
    slug: input.slug,
    displayName: input.displayName,
    profileUrl: absoluteUrl(`/talentos/${input.slug}`),
    status: input.sections.status,
    activeGiveawayCount: giveaways.length,
    accumulatedParticipants: giveaways.reduce(
      (total, giveaway) => total + giveaway.participantCount,
      0,
    ),
    giveaways,
  };
}
