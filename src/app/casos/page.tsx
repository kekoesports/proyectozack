import type { Metadata } from 'next';
import Link from 'next/link';
import { getCaseStudies } from '@/lib/queries/cases';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Campañas Gaming — Resultados Reales',
  description:
    'Campañas reales con marcas top: RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Ver resultados y metodología de SocialPro →',
  alternates: {
    canonical: '/casos',
  },
  openGraph: {
    title: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Campañas gaming con ROI demostrable.',
    url: absoluteUrl('/casos'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campañas Gaming — Resultados Reales | SocialPro',
    description:
      'RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€). Campañas gaming con ROI demostrable.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

export default async function CasosPage() {
  const cases = await getCaseStudies();

  return (
    <div>
      <h1 className="sr-only">Campañas Gaming — Resultados Reales</h1>
      <CasesSection cases={cases} />
      {/* Internal linking to niche SEO landings */}
      <nav aria-label="Servicios relacionados" className="bg-sp-off border-t border-sp-border py-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sp-muted mb-4">Tipos de campaña</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/cs2-influencer-marketing', label: 'CS2 Influencer Marketing' },
              { href: '/servicios/igaming', label: 'iGaming & Betting' },
              { href: '/valorant-influencers-agency', label: 'Valorant Influencers (EN)' },
              { href: '/esports-marketing-agency', label: 'Esports Marketing Agency (EN)' },
              { href: '/influencers-cs2', label: 'Influencers CS2 (ES)' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
