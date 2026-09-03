import type { KekoPilotLocale } from '../content';
import { DEMO_HREF, getHeroCopy } from '../content';
import { KEKOPILOT_APP_URL } from '@/lib/kekopilot-url';
import type { CSSProperties } from 'react';
import styles from '../kekopilot.module.css';
import visual from '../kekopilot-visual.module.css';

type KekoPilotHeroProps = {
  readonly locale: KekoPilotLocale;
};

type BootStyle = CSSProperties & {
  readonly '--boot-delay': string;
};

function BrandMark() {
  return (
    <span className={styles.brand} aria-label="KekoPilot">
      KEKO<span>PILOT</span>
    </span>
  );
}

function SystemGraph({ locale }: KekoPilotHeroProps) {
  const copy = getHeroCopy(locale);

  return (
    <div className={visual.systemPanel} aria-label={copy.graphAlt} role="img">
      <div className={visual.panelTopline}>
        <span>{copy.systemLabel}</span>
        <span className={visual.liveStatus}><i aria-hidden="true" /> Live</span>
      </div>

      <svg className={visual.systemGraph} viewBox="0 0 720 500" aria-hidden="true">
        <g className={visual.wires} fill="none">
          <path d="M122 106 C238 106 215 218 326 218" />
          <path d="M122 218 C228 218 246 238 326 238" />
          <path d="M122 330 C238 330 215 258 326 258" />
          <path d="M454 222 C532 222 530 102 626 102" />
          <path d="M454 238 C548 238 533 194 626 194" />
          <path d="M454 254 C548 254 533 286 626 286" />
          <path d="M454 270 C532 270 530 378 626 378" />
          <path d="M390 286 L390 416 L508 416" />
        </g>

        <g className={visual.sourceNodes}>
          <circle cx="110" cy="106" r="5" />
          <circle cx="110" cy="218" r="5" />
          <circle cx="110" cy="330" r="5" />
          <text x="80" y="88">DISCORD</text>
          <text x="80" y="200">EMAIL</text>
          <text x="54" y="312">SHEETS / DRIVE</text>
        </g>

        <g className={visual.agentNodes}>
          <circle cx="638" cy="102" r="5" />
          <circle cx="638" cy="194" r="5" />
          <circle cx="638" cy="286" r="5" />
          <circle cx="638" cy="378" r="5" />
          <text x="548" y="84">ZACK CRM</text>
          <text x="512" y="176">ZACK DEAL CLERK</text>
          <text x="540" y="268">ZACK GROWTH</text>
          <text x="548" y="360">ZACK SEO</text>
        </g>

        <g className={visual.hub}>
          <rect x="326" y="196" width="128" height="92" />
          <text x="350" y="237">KEKOPILOT</text>
          <text x="350" y="258">CONTROL PLANE</text>
        </g>

        <g className={visual.resultNode}>
          <rect x="508" y="390" width="142" height="52" />
          <text x="530" y="411">HUMAN APPROVAL</text>
          <text x="530" y="428">READY</text>
        </g>

        <g className={visual.signalDots}>
          <circle cx="196" cy="122" r="3" />
          <circle cx="282" cy="233" r="3" />
          <circle cx="500" cy="216" r="3" />
          <circle cx="550" cy="292" r="3" />
          <circle cx="390" cy="342" r="3" />
        </g>
      </svg>

      <div className={visual.graphLegend} aria-hidden="true">
        <span><i /> {copy.sourceLabel}</span>
        <span><i /> {copy.agentLabel}</span>
        <span><i /> {copy.outcomeLabel}</span>
      </div>

      <ol className={visual.bootSequence} aria-label="System status">
        {copy.boot.map((step, index) => {
          const bootStyle: BootStyle = { '--boot-delay': `${0.8 + index * 0.55}s` };
          return (
            <li key={step} style={bootStyle}>
              <span>0{index + 1}</span>
              {step}
              <strong>OK</strong>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function KekoPilotHeader({ locale }: KekoPilotHeroProps) {
  const copy = getHeroCopy(locale);

  return (
      <header className={styles.header} data-kp-header>
        <a className={styles.logoLink} href="#inicio"><BrandMark /></a>
        <nav className={styles.desktopNav} aria-label={locale === 'es' ? 'Navegación principal' : 'Main navigation'}>
          {copy.nav.map((item) => <a data-kp-nav-link key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className={styles.headerActions}>
          <a className={styles.localeLink} href={copy.localeHref} hrefLang={locale === 'es' ? 'en' : 'es'}>{copy.localeLabel}</a>
          <a className={styles.loginLink} href={KEKOPILOT_APP_URL}>{copy.login}</a>
          <a className={styles.headerCta} data-kp-cursor data-kp-magnetic href={DEMO_HREF}>{copy.demo}</a>
        </div>
        <details className={styles.mobileNav}>
          <summary aria-label={locale === 'es' ? 'Abrir navegación' : 'Open navigation'}><span /><span /></summary>
          <div>
            {copy.nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            <a href={copy.localeHref}>{copy.localeLabel}</a>
            <a href={DEMO_HREF}>{copy.demo}</a>
          </div>
        </details>
      </header>
  );
}

export function KekoPilotHero({ locale }: KekoPilotHeroProps) {
  const copy = getHeroCopy(locale);
  const flowId = locale === 'es' ? 'flujo' : 'flow';

  return (
        <section id="inicio" className={styles.hero} aria-labelledby="kekopilot-title" data-kp-section>
          <div className={styles.gridBackdrop} aria-hidden="true" />
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}><span />{copy.eyebrow}</div>
              <h1 id="kekopilot-title">
                <span className={styles.titleLine}><span>{copy.titleLead}</span></span>
                <span className={`${styles.titleLine} ${styles.titleAccent}`}><span>{copy.titleAccent}</span></span>
              </h1>
              <p>{copy.body}</p>
              <div className={styles.heroActions}>
                <a className={styles.primaryCta} data-kp-cursor data-kp-magnetic href={DEMO_HREF}>
                  <span>{copy.demo}</span><i aria-hidden="true">↗</i>
                </a>
                <a className={styles.secondaryCta} data-kp-cursor href={`#${flowId}`}>
                  <span>{copy.secondaryCta}</span><i aria-hidden="true">↓</i>
                </a>
              </div>
            </div>
            <SystemGraph locale={locale} />
          </div>
          <div className={styles.statusStrip}>
            <div>{copy.statuses.map((status) => <span key={status}><i aria-hidden="true" />{status}</span>)}</div>
            <p>{copy.footnote}</p>
          </div>
        </section>
  );
}
