import type { KekoPilotLocale } from '../content';
import { DEMO_HREF, getHeroCopy } from '../content';
import { KEKOPILOT_APP_URL } from '@/lib/kekopilot-url';
import styles from '../kekopilot.module.css';
import { KekoPilotFacets } from './KekoPilotFacets';

type KekoPilotHeroProps = {
  readonly locale: KekoPilotLocale;
};

function BrandMark() {
  return (
    <span className={styles.brand} aria-label="KekoPilot">
      KEKO<span>PILOT</span>
    </span>
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
          <a className={styles.loginLink} href={KEKOPILOT_APP_URL}>{copy.login}</a>
          <a className={styles.headerCta} data-kp-cursor data-kp-magnetic href={DEMO_HREF}>{copy.demo}</a>
        </div>
        <details className={styles.mobileNav} data-kp-mobile-nav>
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
  const productId = locale === 'es' ? 'producto' : 'product';

  return (
        <section id="inicio" className={styles.hero} aria-labelledby="kekopilot-title" data-kp-section>
          <div className={styles.heroField}>
            <KekoPilotFacets />
            <div className={styles.fieldCaption}>
              <span>{copy.systemLabel}</span>
              <span><i aria-hidden="true" /> Live</span>
            </div>
          </div>
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
                <a className={styles.secondaryCta} data-kp-cursor href={`#${productId}`}>
                  <span>{copy.secondaryCta}</span><i aria-hidden="true">↓</i>
                </a>
              </div>
            </div>
          </div>
          <div className={styles.statusStrip}>
            <div>{copy.statuses.map((status) => <span key={status}><i aria-hidden="true" />{status}</span>)}</div>
            <p>{copy.footnote}</p>
          </div>
        </section>
  );
}
