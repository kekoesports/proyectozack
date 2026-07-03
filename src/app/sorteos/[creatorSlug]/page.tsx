import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { talents } from '@/db/schema';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';
import { PlatformCreatorLanding } from '@/features/giveaway-platform/components/PlatformCreatorLanding';
import { absoluteUrl } from '@/lib/site-url';

/**
 * Redirects defensivos por typo del slug del creador. Cada key es un
 * typo conocido; el valor es el slug canónico. Se ejecuta antes del
 * guard contra PLATFORM_CREATOR_SLUGS.
 */
const SLUG_TYPO_REDIRECTS: Record<string, string> = {
  zackezitor: 'zacketizor',
  zacketizador: 'zacketizor',
  huaso: 'huasopeek',
  huasopeak: 'huasopeek',
  naaw: 'naow',
  // Roster nuevo (2026-07-03): defensivos para typos comunes.
  todo: 'todocs2',
  todocs: 'todocs2',
  'todo-cs2': 'todocs2',
  jolucs2: 'jolu',
  jolucs: 'jolu',
  'jolu-cs2': 'jolu',
  imantao: 'imantado',
  imanta: 'imantado',
  // Roster antiguo (martinez retirado 2026-07-03): quien aterrice en la
  // URL antigua va al índice, no a un notFound.
  martinez: '',
  martines: '',
};

export async function generateStaticParams() {
  return PLATFORM_CREATOR_SLUGS.map((slug) => ({ creatorSlug: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creatorSlug: string }>;
}): Promise<Metadata> {
  const { creatorSlug } = await params;
  const slugLc = creatorSlug.toLowerCase();
  const canonicalSlug = SLUG_TYPO_REDIRECTS[slugLc] ?? slugLc;

  // Si no está en la lista, dejamos que el redirect / notFound se haga
  // en el body de la page — el metadata usa un fallback genérico.
  if (!PLATFORM_CREATOR_SLUGS.includes(canonicalSlug as (typeof PLATFORM_CREATOR_SLUGS)[number])) {
    return { title: 'Sorteos · SocialPro' };
  }

  const talent = await db.query.talents.findFirst({
    where: eq(talents.slug, canonicalSlug),
  });
  const name = talent?.name.toUpperCase() ?? canonicalSlug.toUpperCase();

  return {
    title: `Sorteos de ${name} | SocialPro Giveaways`,
    description: `Participa gratis en los sorteos de ${name} y canjea recompensas en SocialPro Giveaways. Login con Steam, sin depósitos, +18.`,
    alternates: { canonical: `/sorteos/${canonicalSlug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `Sorteos de ${name} · SocialPro Giveaways`,
      description: `Sorteos gratis con tus creadores favoritos de SocialPro. Participa con Steam, gana 🪙 y canjea recompensas.`,
      url: absoluteUrl(`/sorteos/${canonicalSlug}`),
    },
  };
}

export default async function SorteosCreatorPage({
  params,
}: {
  params: Promise<{ creatorSlug: string }>;
}) {
  const { creatorSlug } = await params;
  const slugLc = creatorSlug.toLowerCase();

  // Redirect defensivo por typos conocidos. Target='' → índice /sorteos
  // (útil para slugs retirados como martinez).
  if (Object.prototype.hasOwnProperty.call(SLUG_TYPO_REDIRECTS, slugLc)) {
    const target = SLUG_TYPO_REDIRECTS[slugLc];
    redirect(target ? `/sorteos/${target}` : '/sorteos');
  }

  // Guard duro contra slugs que no son creadores de la plataforma.
  if (!PLATFORM_CREATOR_SLUGS.includes(slugLc as (typeof PLATFORM_CREATOR_SLUGS)[number])) {
    notFound();
  }

  return <PlatformCreatorLanding slug={slugLc} />;
}
