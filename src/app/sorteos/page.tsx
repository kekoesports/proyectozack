import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { inArray } from 'drizzle-orm';
import { talents } from '@/db/schema';
import { PLATFORM_CREATOR_SLUGS } from '@/lib/giveaway-platform/constants';
import { getCreatorVisual } from '@/features/giveaway-platform/constants/creators';
import { isExternalCreator, getCreatorBinding } from '@/lib/external-giveaways/creator-bindings';
import { getProvider } from '@/lib/external-giveaways/providers';
import { PlatformFooter } from '@/features/giveaway-platform/components/PlatformFooter';
import { PlatformShell } from '@/features/giveaway-platform/components/PlatformShell';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Sorteos y recompensas de creadores | SocialPro',
  description:
    'Índice público de SocialPro Giveaways. Elige un creador y participa gratis en sus sorteos, gana puntos y canjea recompensas. Login con Steam, sin depósitos, +18.',
  alternates: { canonical: '/sorteos' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'SocialPro Giveaways · sorteos gratuitos de creadores',
    description:
      'Elige tu creador favorito, participa gratis, gana puntos y canjea recompensas. Login con Steam, sin depósitos, +18.',
    url: absoluteUrl('/sorteos'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'SocialPro Giveaways',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialPro Giveaways · sorteos gratuitos de creadores',
    description:
      'Elige tu creador favorito, participa gratis, gana puntos y canjea recompensas. Login con Steam, sin depósitos, +18.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

export default async function SorteosIndexPage() {
  const dbCreators = await db.query.talents.findMany({
    where: inArray(talents.slug, [...PLATFORM_CREATOR_SLUGS]),
  });

  // Ordena: primero los que tienen binding externo confirmado, luego el resto.
  const creators = [...dbCreators].sort((a, b) => {
    const aExt = isExternalCreator(a.slug) ? 0 : 1;
    const bExt = isExternalCreator(b.slug) ? 0 : 1;
    return aExt - bExt;
  });

  return (
    <PlatformShell>
      <nav className="gp-legal-nav" aria-label="SocialPro Giveaways">
        <div className="gp-legal-nav-inner">
          <Link href="/sorteos" className="gp-logo" aria-label="SocialPro Giveaways">
            <Image
              src="/logo.png"
              alt="SocialPro"
              width={130}
              height={68}
              className="gp-logo-img"
              priority
            />
            <span className="gp-logo-tag">
              <b>Giveaways</b>
              <span>Sorteos de creadores</span>
            </span>
          </Link>
          <div className="gp-legal-nav-links">
            <Link href="/sorteos/faq">FAQ</Link>
            <Link href="/sorteos/participacion-responsable">Participación responsable</Link>
          </div>
        </div>
      </nav>

      <main className="gp-index-wrap">
        <header className="gp-index-hero">
          <p className="gp-index-eyebrow">SocialPro Giveaways</p>
          <h1>
            Sorteos gratis con tus <span className="gp-index-hero-accent">creadores favoritos</span>
          </h1>
          <p className="gp-index-lead">
            Elige un creador, inicia sesión con Steam y participa <b>gratis</b> en sus sorteos.
            Gana puntos <b>⭐</b> por participar, completar misiones y mantener la racha diaria,
            y cánjealos por skins, merchandising o tarjetas regalo. Sin depósitos, sin apuestas, +18.
          </p>
          <div className="gp-index-hero-cta">
            <Link href="/sorteos/faq" className="gp-btn gp-btn-ghost">¿Cómo funciona?</Link>
          </div>
        </header>

        <section aria-labelledby="creadores-titulo" className="gp-index-creators">
          <h2 id="creadores-titulo">Creadores</h2>
          {creators.length === 0 ? (
            <p className="gp-rank-empty">
              Todavía no hay creadores configurados en la plataforma. Vuelve pronto.
            </p>
          ) : (
            <ul className="gp-index-grid" role="list">
              {creators.map((c) => {
                const visual = getCreatorVisual(c.slug);
                const binding = getCreatorBinding(c.slug);
                const provider = binding ? getProvider(binding.provider) : null;
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/sorteos/${c.slug}`}
                      className="gp-index-card"
                      style={{
                        ['--c1' as string]: c.gradientC1,
                        ['--c2' as string]: c.gradientC2,
                      }}
                    >
                      <span className="gp-index-card-glow" aria-hidden />
                      <div className="gp-index-card-avatar" aria-hidden>
                        {c.photoUrl ? (
                          <Image
                            src={c.photoUrl}
                            alt=""
                            fill
                            sizes="72px"
                            unoptimized
                          />
                        ) : (
                          <span className="gp-index-card-emoji">{visual.emoji}</span>
                        )}
                      </div>
                      <div className="gp-index-card-body">
                        <p className="gp-index-card-code">{visual.code}</p>
                        <p className="gp-index-card-name">{c.name}</p>
                        <p className="gp-index-card-role">{c.role}</p>
                        {provider ? (
                          <p className="gp-index-card-partner">
                            <b>Partner:</b> {provider.displayName}
                          </p>
                        ) : (
                          <p className="gp-index-card-partner gp-index-card-partner-soon">
                            Provider próximamente
                          </p>
                        )}
                      </div>
                      <span className="gp-index-card-cta">Ver sorteos →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="gp-index-explainer" aria-labelledby="como-titulo">
          <h2 id="como-titulo">Cómo funciona</h2>
          <ol className="gp-index-steps">
            <li>
              <b>Elige tu creador.</b> Cada creador tiene su propia sección con sus sorteos
              activos y su código promocional.
            </li>
            <li>
              <b>Inicia sesión con Steam.</b> Solo pedimos tu identidad pública de Steam:
              nombre, avatar y Steam ID. Ni tarjeta ni contraseñas.
            </li>
            <li>
              <b>Participa gratis.</b> Cada participación cuenta un ticket + ganas puntos ⭐.
              La racha diaria y las misiones te suman más.
            </li>
            <li>
              <b>Canjea recompensas.</b> Con tus puntos ⭐ puedes canjear skins CS2, merchandising
              o tarjetas regalo en las recompensas internas.
            </li>
          </ol>
          <p className="gp-index-explainer-note">
            SocialPro Giveaways no acepta depósitos, no cobra comisiones y los puntos no
            tienen valor monetario. Los sorteos internos son <b>gratuitos</b>. Algunos
            creadores enlazan partners externos con sus propios términos.
          </p>
        </section>

        <PlatformFooter />
      </main>
    </PlatformShell>
  );
}
