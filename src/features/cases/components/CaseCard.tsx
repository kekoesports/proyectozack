'use client';

import Link from 'next/link';
import * as m from 'motion/react-client';
import type { CaseStudyWithRelations } from '@/types';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getCaseConfig } from '@/features/cases/case-config';

type CaseCardProps = {
  caseStudy: CaseStudyWithRelations;
}

export function CaseCard({ caseStudy }: CaseCardProps) {
  const config  = getCaseConfig(caseStudy.slug);
  const logoSrc = config.logoUrl ?? caseStudy.logoUrl;
  // 1WIN tiene artwork con blob blanco integrado — no necesita plate
  const plate   = caseStudy.brandName === '1WIN' ? 'none' : 'dark';
  const stats   = config.stats.slice(0, 3);

  return (
    <Link href={`/casos/${caseStudy.slug}`} className="block h-full">
      <m.div
        whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="group rounded-2xl overflow-hidden border border-sp-border bg-white flex flex-col h-full"
      >
        <header className="h-24 bg-sp-dark flex items-center px-5 flex-shrink-0">
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
        </header>

        <article className="p-5 flex flex-col flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sp-orange mb-2">
            {config.sector ?? `${caseStudy.brandName} × SocialPro`}
          </p>

          <h3 className="font-display text-lg font-black uppercase text-sp-dark leading-snug mb-3 line-clamp-2">
            {caseStudy.title}
          </h3>

          {caseStudy.body[0] && (
            <p className="text-sm text-sp-muted leading-relaxed mb-4 line-clamp-3">
              {caseStudy.body[0].paragraph}
            </p>
          )}

          {stats.length > 0 && (
            <div className="flex gap-4 border-t border-sp-border pt-4 mb-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className={`font-display font-black leading-none gradient-text ${
                    s.value.length > 6 ? 'text-sm' : 'text-xl'
                  }`}>
                    {s.value}
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-sp-muted mt-0.5">
                    {s.label}
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

          <div className="mt-auto">
            <span className="text-xs font-semibold text-sp-orange">
              Ver resultados →
            </span>
          </div>
        </article>
      </m.div>
    </Link>
  );
}
