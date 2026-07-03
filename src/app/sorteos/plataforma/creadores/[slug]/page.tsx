import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import {
  getCoinBalance,
  getGiveawaysWithEntryData,
} from '@/lib/queries/giveawayPlatform';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';
import { getCreatorVisual } from '@/features/giveaway-platform/constants/creators';
import { PlatformNav } from '@/features/giveaway-platform/components/PlatformNav';
import { PlatformFooter } from '@/features/giveaway-platform/components/PlatformFooter';
import { getExternalGiveawaysForCreator } from '@/lib/queries/externalGiveaways';
import { isExternalCreator } from '@/lib/external-giveaways/creator-bindings';

export const metadata = {
  title: 'Perfil del creador · SocialPro Sorteos',
  robots: { index: false, follow: false },
};

/**
 * Perfil placeholder de un creador dentro de la plataforma de sorteos.
 * En esta iteración solo mostramos: bio, avatar, código promocional, socials
 * (con avg_viewers si lo tenemos) y CTA para ir al bloque de sorteos del
 * creador en la landing principal. La sección "Estadísticas históricas"
 * queda marcada como "próximamente" — se activará cuando enganchemos
 * ranking por creador + histórico de ganadores en PR3.
 */
export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Guard: solo creadores registrados en la plataforma tienen perfil aquí.
  if (!PLATFORM_CREATOR_SLUGS.includes(slug as (typeof PLATFORM_CREATOR_SLUGS)[number])) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? null;

  const [dbCreators, balance] = await Promise.all([
    db.query.talents.findMany({
      where: inArray(talents.slug, [...PLATFORM_CREATOR_SLUGS]),
      with: { socials: true },
    }),
    userId ? getCoinBalance(userId) : Promise.resolve(0),
  ]);

  const active = dbCreators.find((c) => c.slug === slug);
  if (!active) notFound();

  const activeVisual = getCreatorVisual(active.slug);
  const creatorOptions = dbCreators.map((c) => {
    const visual = getCreatorVisual(c.slug);
    return {
      slug: c.slug,
      name: c.name,
      emoji: visual.emoji,
      color: visual.color,
      sub: visual.sub,
      photoUrl: c.photoUrl,
    };
  });

  const isExternal = isExternalCreator(active.slug);
  const [giveawaysData, externalSections] = await Promise.all([
    isExternal ? [] : getGiveawaysWithEntryData(active.id, userId),
    isExternal
      ? getExternalGiveawaysForCreator(active.slug)
      : Promise.resolve(null),
  ]);

  const activeCount = isExternal
    ? (externalSections?.active.length ?? 0)
    : giveawaysData.length;

  return (
    <>
      <PlatformNav
        creators={creatorOptions}
        activeSlug={active.slug}
        userName={userName}
        userImage={userImage}
        balance={balance}
        loggedIn={Boolean(userId)}
      />

      <main className="gp-wrap">
        <section
          className="gp-creator-hero"
          style={{
            ['--c1' as string]: active.gradientC1,
            ['--c2' as string]: active.gradientC2,
          }}
        >
          <div className="gp-creator-avatar">
            {active.photoUrl ? (
              <Image src={active.photoUrl} alt={active.name} width={144} height={144} unoptimized />
            ) : (
              <span className="gp-creator-emoji" aria-hidden>{activeVisual.emoji}</span>
            )}
          </div>
          <div className="gp-creator-head">
            <span className="gp-creator-code">{activeVisual.code}</span>
            <h1>{active.name}</h1>
            <p className="gp-creator-role">{active.role}</p>
            <p className="gp-creator-bio">{active.bio}</p>
            <div className="gp-creator-actions">
              <a href={`/sorteos/plataforma?creador=${active.slug}#sorteos`} className="gp-btn gp-btn-primary">
                🎯 Ver sorteos {activeCount > 0 ? `(${activeCount})` : ''}
              </a>
              <a href={`/sorteos/plataforma?creador=${active.slug}#misiones`} className="gp-btn gp-btn-ghost">
                ⚡ Misiones
              </a>
            </div>
          </div>
        </section>

        <section className="gp-legacy-block">
          <h2>Canales sociales</h2>
          {active.socials.length === 0 ? (
            <p className="gp-rank-empty">Este creador aún no tiene canales sincronizados.</p>
          ) : (
            <ul className="gp-creator-socials">
              {active.socials.map((s) => (
                <li
                  key={s.id}
                  style={{ ['--c' as string]: s.hexColor }}
                >
                  <span className="p">{s.platform.toUpperCase()}</span>
                  <b>{s.handle}</b>
                  <span className="f">{s.followersDisplay} seguidores</span>
                  {s.profileUrl ? (
                    <a href={s.profileUrl} target="_blank" rel="noopener noreferrer" className="l">
                      Abrir →
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gp-legacy-block gp-creator-soon">
          <h2>📊 Estadísticas históricas</h2>
          <p className="gp-rank-note">
            Próximamente: podium mensual por creador, ganadores recientes, evolución de participaciones y
            record histórico de premios. Se activará cuando el ranking mensual pase a nivel creador (PR3).
          </p>
          <div className="gp-creator-soon-grid">
            <div className="gp-creator-soon-card">
              <span className="l">🏆 Ganadores</span>
              <b>Próximamente</b>
              <span className="s">Últimos 30 días</span>
            </div>
            <div className="gp-creator-soon-card">
              <span className="l">🎁 Premios repartidos</span>
              <b>Próximamente</b>
              <span className="s">Valor total en €</span>
            </div>
            <div className="gp-creator-soon-card">
              <span className="l">👥 Comunidad activa</span>
              <b>Próximamente</b>
              <span className="s">Participantes únicos / mes</span>
            </div>
            <div className="gp-creator-soon-card">
              <span className="l">🎯 Sorteos totales</span>
              <b>Próximamente</b>
              <span className="s">All-time</span>
            </div>
          </div>
        </section>

        <PlatformFooter />
      </main>
    </>
  );
}

// Pre-generar rutas para todos los creadores de la plataforma.
export function generateStaticParams() {
  return PLATFORM_CREATOR_SLUGS.map((slug) => ({ slug }));
}
