import { COVERAGE, MAPS_POOL } from './tokens';

export function CoverageMarquee() {
  const items = [...COVERAGE, ...MAPS_POOL.map((m) => `Map · ${m}`)];
  const loop = [...items, ...items];

  return (
    <section
      aria-label="Cobertura competitiva"
      className="relative bg-sp-black border-y border-white/[0.06] py-7 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-sp-black to-transparent pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-sp-black to-transparent pointer-events-none"
      />

      <div className="apuesta-marquee-track flex gap-10 whitespace-nowrap will-change-transform">
        {loop.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="inline-flex items-center gap-3 font-display font-black uppercase tracking-[0.18em] text-sm text-white/55"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sp-orange" />
            {label}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes apuesta-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .apuesta-marquee-track {
          animation: apuesta-marquee 40s linear infinite;
        }
        .apuesta-marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .apuesta-marquee-track { animation: none; }
        }
      `}</style>
    </section>
  );
}
