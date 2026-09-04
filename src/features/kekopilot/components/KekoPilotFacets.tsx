import styles from '../kekopilot-facets.module.css';

type KekoPilotFacetsProps = {
  readonly variant?: 'hero' | 'poster';
};

const FACETS = [
  ['0,0 210,0 128,152 0,238', 'f01'],
  ['210,0 402,0 338,128 128,152', 'f02'],
  ['402,0 620,0 548,170 338,128', 'f03'],
  ['620,0 800,0 800,238 548,170', 'f04'],
  ['0,238 128,152 280,292 112,402 0,368', 'f05'],
  ['128,152 338,128 390,286 280,292', 'f06'],
  ['338,128 548,170 510,332 390,286', 'f07'],
  ['548,170 800,238 800,390 656,420 510,332', 'f08'],
  ['0,368 112,402 240,514 98,620 0,568', 'f09'],
  ['112,402 280,292 390,286 402,500 240,514', 'f10'],
  ['390,286 510,332 656,420 554,542 402,500', 'f11'],
  ['656,420 800,390 800,614 650,650 554,542', 'f12'],
  ['0,568 98,620 220,756 0,828', 'f13'],
  ['98,620 240,514 402,500 426,716 220,756', 'f14'],
  ['402,500 554,542 650,650 584,786 426,716', 'f15'],
  ['650,650 800,614 800,900 584,786', 'f16'],
  ['0,828 220,756 322,900 0,900', 'f17'],
  ['220,756 426,716 584,786 690,900 322,900', 'f18'],
  ['584,786 800,900 690,900', 'f19'],
] as const;

export function KekoPilotFacets({ variant = 'hero' }: KekoPilotFacetsProps) {
  return (
    <div className={styles.field} data-variant={variant} aria-hidden="true">
      <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`kp-facet-glow-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#302d2b" />
            <stop offset="0.52" stopColor="#1a1817" />
            <stop offset="1" stopColor="#0f0e0e" />
          </linearGradient>
          <radialGradient id={`kp-facet-light-${variant}`} cx="68%" cy="28%" r="72%">
            <stop offset="0" stopColor="#5a5551" stopOpacity=".72" />
            <stop offset=".42" stopColor="#272422" stopOpacity=".28" />
            <stop offset="1" stopColor="#11100f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="900" fill={`url(#kp-facet-glow-${variant})`} />
        <g className={styles.facets}>
          {FACETS.map(([points, name], index) => (
            <polygon key={name} points={points} data-depth={index % 5} />
          ))}
        </g>
        <rect width="800" height="900" fill={`url(#kp-facet-light-${variant})`} />
        <g className={styles.seams}>
          <path d="M-20 368 L112 402 L240 514 L402 500 L554 542 L650 650 L820 614" />
          <path d="M210 -20 L128 152 L280 292 L390 286 L510 332 L548 170 L620 -20" />
          <path d="M98 620 L220 756 L426 716 L584 786 L690 920" />
        </g>
      </svg>
      <div className={styles.scan} />
    </div>
  );
}
