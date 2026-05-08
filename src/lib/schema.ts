/**
 * Generadores de Schema.org JSON-LD para páginas clave de SocialPro.
 *
 * Uso: importar la función, llamarla con los datos de la página y
 * renderizar el resultado con:
 *   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
 */

import type { GiveawayWithTalent, CreatorCodeWithTalent } from '@/types';

// ── Event (sorteo activo) ────────────────────────────────────────────────

/**
 * Schema Event para un sorteo activo.
 * https://schema.org/Event
 */
export function generateEventSchema(g: GiveawayWithTalent, siteUrl: string): object {
  const now = new Date();
  const isActive = !g.endsAt || g.endsAt > now;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `Sorteo: ${g.title}`,
    description: g.description ?? `Sorteo de ${g.brandName} con ${g.talent.name} en SocialPro.`,
    startDate: g.startsAt.toISOString(),
    ...(g.endsAt ? { endDate: g.endsAt.toISOString() } : {}),
    eventStatus: isActive
      ? 'https://schema.org/EventScheduled'
      : 'https://schema.org/EventPostponed',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    url: g.redirectUrl,
    image: g.imageUrl ?? `${siteUrl}/api/og-image/giveaway?id=${g.id}`,
    organizer: {
      '@type': 'Organization',
      name: g.brandName,
      ...(g.brandLogo ? { logo: g.brandLogo } : {}),
    },
    performer: {
      '@type': 'Person',
      name: g.talent.name,
      url: `${siteUrl}/talentos/${g.talent.slug}`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: g.redirectUrl,
      validFrom: g.startsAt.toISOString(),
      ...(g.endsAt ? { validThrough: g.endsAt.toISOString() } : {}),
    },
  };
}

// ── Offer (código de descuento) ──────────────────────────────────────────

/**
 * Schema Offer para un código de creador.
 * https://schema.org/Offer
 */
export function generateOfferSchema(c: CreatorCodeWithTalent, siteUrl: string): object {
  return {
    '@type': 'Offer',
    name: c.code,
    description: c.description ?? `Código de ${c.brandName} de ${c.talent.name}`,
    url: c.redirectUrl,
    category: 'Gaming',
    seller: {
      '@type': 'Organization',
      name: c.brandName,
      ...(c.brandLogo ? { logo: c.brandLogo } : {}),
    },
    offeredBy: {
      '@type': 'Person',
      name: c.talent.name,
      url: `${siteUrl}/talentos/${c.talent.slug}`,
    },
  };
}

// ── ItemList wrappers ────────────────────────────────────────────────────

/**
 * Schema ItemList de sorteos activos (como Events).
 * Para el hub /giveaways y /sorteos.
 */
export function generateGiveawayListSchema(
  giveaways: GiveawayWithTalent[],
  siteUrl: string,
  listName = 'Sorteos activos en SocialPro',
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: giveaways.length,
    itemListElement: giveaways.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: generateEventSchema(g, siteUrl),
    })),
  };
}

/**
 * Schema ItemList de códigos de descuento (como Offers).
 * Para el hub /giveaways y páginas de marca.
 */
export function generateCodeListSchema(
  codes: CreatorCodeWithTalent[],
  siteUrl: string,
  listName = 'Códigos activos en SocialPro',
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: codes.length,
    itemListElement: codes.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: generateOfferSchema(c, siteUrl),
    })),
  };
}

