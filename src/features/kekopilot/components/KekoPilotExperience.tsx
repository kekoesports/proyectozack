import { Familjen_Grotesk, IBM_Plex_Mono, Karla } from 'next/font/google';
import type { KekoPilotLocale } from '../content';
import { KekoPilotHeader, KekoPilotHero } from './KekoPilotHero';
import { KekoPilotMotion } from './KekoPilotMotion';
import { KekoPilotSections } from './KekoPilotSections';
import { KekoPilotStory } from './KekoPilotStory';
import { KekoPilotValue } from './KekoPilotValue';
import styles from '../kekopilot.module.css';

const heading = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--kp-font-heading',
  display: 'swap',
});

const body = Karla({
  subsets: ['latin'],
  variable: '--kp-font-body',
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
  return (
    <div className={`${styles.site} ${heading.variable} ${body.variable} ${mono.variable}`} data-kp-root>
      <a className={styles.skipLink} href="#contenido">
        {locale === 'es' ? 'Saltar al contenido' : 'Skip to content'}
      </a>
      <KekoPilotMotion />
      <KekoPilotHeader locale={locale} />
      <main className={styles.main} id="contenido">
        <KekoPilotHero locale={locale} />
        <KekoPilotValue locale={locale} />
        <KekoPilotStory locale={locale} />
        <KekoPilotSections locale={locale} />
      </main>
    </div>
  );
}
