'use client';

import { useRef, useEffect } from 'react';
import { useCountUp } from 'react-countup';
import * as m from 'motion/react-client';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { useVisibilityFailSafe } from '@/lib/utils/use-visibility-failsafe';

type Metric = {
  end: number;
  prefix: string;
  suffix: string;
  decimals: number;
  label: string;
}

const METRICS: Metric[] = [
  { end: 13,  prefix: '',  suffix: '+', decimals: 0, label: 'AÑOS' },
  { end: 15,  prefix: '',  suffix: 'M', decimals: 0, label: 'VIEWS/MES' },
  { end: 15,  prefix: '',  suffix: '',  decimals: 0, label: 'CAMPAÑAS' },
  { end: 340, prefix: '+', suffix: '',  decimals: 0, label: 'FTDS' },
  { end: 3,   prefix: '',  suffix: '',  decimals: 0, label: 'MERCADOS' },
  { end: 8.4, prefix: '',  suffix: '%', decimals: 1, label: 'CTR' },
];

function AnimatedMetric({ metric, index, started }: { metric: Metric; index: number; started: boolean }) {
  const countRef = useRef<HTMLElement>(null);

  const { start } = useCountUp({
    ref: countRef as React.RefObject<HTMLElement>,
    start: 0,
    end: metric.end,
    duration: 1.8,
    decimals: metric.decimals,
    prefix: metric.prefix,
    suffix: metric.suffix,
    startOnMount: false,
    easingFn: (t, b, c, d) => {
      // ease-out expo
      return t === d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    },
  });

  useEffect(() => {
    if (started) start();
  }, [started, start]);

  const [tileRef, tileVisible] = useVisibilityFailSafe<HTMLDivElement>();

  return (
    <m.div
      ref={tileRef}
      data-motion-fallback=""
      className="px-4 py-6 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={tileVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <span
        ref={countRef as React.RefObject<HTMLSpanElement>}
        className="font-display text-4xl md:text-5xl font-black mb-1 block gradient-text"
      >
        {metric.prefix}{metric.decimals > 0 ? metric.end.toFixed(metric.decimals) : metric.end}{metric.suffix}
      </span>
      <div className="text-xs font-semibold text-sp-muted uppercase tracking-widest">
        {metric.label}
      </div>
    </m.div>
  );
}

/**
 * Bloque de KPIs animados (años, views/mes, campañas, FTDs, mercados, CTR)
 * que arrancan los counters al entrar en viewport via `useInView`.
 *
 * @kind client
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <MetricsSection />
 * ```
 */
export function MetricsSection() {
  const [gridRef, started] = useVisibilityFailSafe<HTMLDivElement>({ amount: 0.2 });

  return (
    <section className="py-14 bg-sp-off">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>Resultados</SectionTag>
            <SectionHeading>
              <GradientText>Números</GradientText> que hablan
            </SectionHeading>
          </div>
        </FadeInOnScroll>
        <div ref={gridRef} className="grid grid-cols-3 md:grid-cols-6 divide-x divide-sp-border">
          {METRICS.map((metric, i) => (
            <AnimatedMetric key={metric.label} metric={metric} index={i} started={started} />
          ))}
        </div>
      </div>
    </section>
  );
}
