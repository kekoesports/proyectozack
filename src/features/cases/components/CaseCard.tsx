'use client';

import Link from 'next/link';
import * as m from 'motion/react-client';
import type { CaseStudyWithRelations } from '@/types';
import { BrandLogo } from '@/components/ui/BrandLogo';

type CaseCardProps = {
  caseStudy: CaseStudyWithRelations;
}

/**
 * Map de marcas a logo PNG transparente. Se prioriza sobre `caseStudy.logoUrl`
 * (que apunta a JPG con fondo negro) para que el tratamiento monocromo
 * del componente <BrandLogo /> funcione limpio.
 */
const BRAND_LOGO_MAP: Record<string, string> = {
  'RAZER':         '/images/brands/razer.png',
  '1WIN':          '/images/brands/1win.png',
  'SKINSMONKEY':   '/images/brands/skinsmonkey.png',
  'KEYDROP':       '/images/brands/keydrop.png',
  'HELLCASE':      '/images/brands/hellcase.png',
  'SKINPLACE':     '/images/brands/skinplace.png',
  'SKINCLUB':      '/images/brands/skinclub.png',
  'GGDROP':        '/images/brands/ggdrop.png',
  'CLASHGG':       '/images/brands/clashgg.jpg',
  'MELBET':        '/images/brands/melbet.png',
  'JUGABET':       '/images/brands/jugabet.png',
  'PINUP':         '/images/brands/pinup.png',
  'PIN-UP':        '/images/brands/pinup.png',
  'GRANDWIN':      '/images/brands/grandwin.png',
  'KICK':          '/images/brands/kick.png',
  'PCCOMPONENTES': '/images/brands/pccomponentes.png',
  'EMMA':          '/images/brands/emma.png',
  'ZEROTWO':       '/images/brands/zerotwo.png',
};

/**
 * Card de case study: logo de marca, título y métricas clave (alcance,
 * engagement, conversiones, ROI). Linkea a `/casos/[slug]`.
 *
 * @kind client
 * @feature cases
 * @example
 * ```tsx
 * <CaseCard caseStudy={caseStudy} />
 * ```
 */
export function CaseCard({ caseStudy }: CaseCardProps) {
  // Preferir PNG transparente del brand registry sobre JPG del caso —
  // los JPG en `public/images/cases/*` tienen fondo negro opaco que rompe
  // el tratamiento monocromo del logo. Si no hay match, fallback al field BD.
  const logoSrc = BRAND_LOGO_MAP[caseStudy.brandName] ?? caseStudy.logoUrl;

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
        {/* Dark header with brand logo — silueta blanca → color real al hover de la card */}
        <header className="h-20 bg-sp-dark flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center">
            {logoSrc ? (
              <BrandLogo
                src={logoSrc}
                alt={caseStudy.brandName}
                tone="on-dark"
                size="xl"
                width={180}
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

        {/* White body */}
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

          {/* Metrics — inline row */}
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

          {/* Tags */}
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
