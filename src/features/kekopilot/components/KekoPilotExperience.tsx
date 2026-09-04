import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import type { KekoPilotLocale } from '../content';
import { getHeroCopy } from '../content';
import { KekoPilotHeader, KekoPilotHero } from './KekoPilotHero';
import { KekoPilotMotion } from './KekoPilotMotion';
import { KekoPilotProduct, KekoPilotPromise } from './KekoPilotProduct';
import { KekoPilotSections } from './KekoPilotSections';
import { KekoPilotStory } from './KekoPilotStory';
import styles from '../kekopilot.module.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--kp-font-archivo',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--kp-font-mono',
  display: 'swap',
});

type KekoPilotExperienceProps = {
  readonly locale: KekoPilotLocale;
};

export function KekoPilotExperience({ locale }: KekoPilotExperienceProps) {
  const copy = getHeroCopy(locale);

  return (
    <div
      className={`${styles.site} ${archivo.variable} ${mono.variable}`}
      data-kp-root
      data-kp-version="web-v6"
    >
      <a className={styles.skipLink} href="#contenido">
        {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
      </a>
      <KekoPilotMotion />
      <div className={styles.versionBar}>
        <span>Web v6 · KekoPilot</span>
        <a href={copy.localeHref} hrefLang={locale === 'es' ? 'en' : 'es'}>
          {copy.localeLabel}
        </a>
      </div>
      <KekoPilotHeader locale={locale} />
      <main className={styles.main} id="contenido">
        <KekoPilotHero locale={locale} />
        <KekoPilotPromise locale={locale} />
        <KekoPilotProduct locale={locale} />
        <KekoPilotStory locale={locale} />
        <KekoPilotSections locale={locale} />
      </main>
    </div>
  );
}
