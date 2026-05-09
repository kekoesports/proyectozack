'use client';

import Link from 'next/link';
import * as m from 'motion/react-client';
import type { CaseStudyWithRelations } from '@/types';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getBrandBg } from '@/components/ui/brand-bg-map';

type CaseCardProps = {
  caseStudy: CaseStudyWithRelations;
}

/**
 * Map de marcas a logo PNG/SVG transparente del registry local.
 * Se prioriza sobre `caseStudy.logoUrl` (que apunta a JPG con fondo).
 */
const BRAND_LOGO_MAP: Record<string, string> = {
  'RAZER':         '/images/brands/razer.png',
  '1WIN':          '/images/brands/1win.png',
  '1XBET':         '/images/brands/1xbet.png',
  'SKINSMONKEY':   '/images/brands/skinsmonkey.png',
  'KEYDROP':       '/images/brands/keydrop.png',
  'HELLCASE':      '/images/brands/hellcase.png',
  'SKINPLACE':     '/images/brands/skinplace.png',
  'SKINCLUB':      '/images/brands/skinclub.png',
  'GGDROP':        '/images/brands/ggdrop.png',
  'CLASHGG':       '/images/brands/clashgg.webp',
  'MELBET':        '/images/brands/melbet.png',
  'JUGABET':       '/images/brands/jugabet.svg',
  'PINUP':         '/images/brands/pinup.png',
  'PIN-UP':        '/images/brands/pinup.png',
  'KICK':          '/images/brands/kick.png',
  'PCCOMPONENTES': '/images/brands/pccomponentes.png',
  'EMMA':          '/images/brands/enma.png',
  'ENMA':          '/images/brands/enma.png',
  'EMPIREDROP':    '/images/brands/empiredrop.svg',
  'EVOPLAY':       '/images/brands/evoplay.png',
};

/**
 * Card de case study: logo de marca, título y métricas clave.
 *
 * @kind client
 * @feature cases
 */
export function CaseCard({ caseStudy }: CaseCardProps) {
  const logoSrc = BRAND_LOGO_MAP[caseStudy.brandName] ?? caseStudy.logoUrl;
  const plate = getBrandBg(caseStudy.brandName);

  const metrics = [
    caseStudy.reach          ? { value: caseStudy.reach,          label: 'Alcance'      } : null,
    caseStudy.engagementRate ? { value: caseStudy.engagementRate, label: 'Engagement'   } : null,
    caseStudy.conversions    ? { value: caseStudy.conversions,    label: 'Conversiones' } : null,
    caseStudy.roiMultiplier  ? { value: caseStudy.roiMultiplier,  label: 'ROI'          } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <Link href={`/casos/${caseStudy.slug}`} className="block h-full">
      <m.div
        whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="group rounded-2xl overflow-hidden border border-sp-border bg-white flex flex-col h-full"
      >
        {/* Dark header con plate uniforme: el plate (light o dark) es la
            superficie real del logo, garantizando legibilidad sobre el
            fondo `sp-dark` del header. */}
        <header className="h-24 bg-sp-dark flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center">
            {logoSrc ? (
              <BrandLogo
                src={logoSrc}
                alt={caseStudy.brandName}
                plate={plate}
                size="lg"
                width={240}
                height={56}
              />
            ) : (
              <span className="font-display text-xl font-black text-white tracking-tight">
                {caseStudy.brandName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-px h-5 bg-white/20" />
            <span className="font-display text-sm font-black text-white/30">×</span>
          </div>
        </header>

        <article className="p-5 flex flex-col flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-orange mb-2">
            {caseStudy.brandName} × SocialPro
          </p>

          <h3 className="font-display text-lg font-black uppercase text-sp-dark leading-snug mb-3 line-clamp-2">
            {caseStudy.title}
          </h3>

          {caseStudy.body[0] && (
            <p className="text-sm text-sp-muted leading-relaxed mb-4 line-clamp-3">
              {caseStudy.body[0].paragraph}
            </p>
          )}

          {metrics.length > 0 && (
            <div className="flex gap-4 border-t border-sp-border pt-4 mb-4">
              {metrics.slice(0, 3).map((met) => (
                <div key={met.label}>
                  <div className="font-display text-xl font-black leading-none gradient-text">
                    {met.value}
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-sp-muted mt-0.5">
                    {met.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {caseStudy.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {caseStudy.tags.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-sp-off text-sp-muted font-semibold uppercase tracking-wide border border-sp-border"
                >
                  {t.tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sp-orange">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-xs font-semibold text-sp-orange">
              Leer más
            </span>
          </div>
        </article>
      </m.div>
    </Link>
  );
}
