import type { KekoPilotLocale } from '../content';
import { DEMO_HREF, getHeroCopy, SOCIALPRO_URL } from '../content';
import { KEKOPILOT_APP_URL } from '@/lib/kekopilot-url';
import { AgentConsole, SolutionsConsole } from './KekoPilotControls';
import common from '../kekopilot-sections.module.css';
import sales from '../kekopilot-sales.module.css';
import styles from '../kekopilot-static.module.css';

type KekoPilotSectionsProps = {
  readonly locale: KekoPilotLocale;
};

export function KekoPilotSections({ locale }: KekoPilotSectionsProps) {
  const copy = getHeroCopy(locale);
  const ids = locale === 'es'
    ? { agents: 'agentes', modules: 'modulos', security: 'seguridad', integrations: 'integraciones' }
    : { agents: 'agents', modules: 'modules', security: 'security', integrations: 'integrations' };

  return (
    <>
      <section id={ids.agents} className={styles.contentSection} data-kp-section aria-labelledby="agents-title">
        <div className={common.sectionFrame}>
          <div className={styles.sectionIntro} data-kp-reveal>
            <span className={common.kicker}>{copy.agents.kicker}</span>
            <div>
              <h2 id="agents-title">{copy.agents.title}</h2>
              <p>{copy.agents.body}</p>
            </div>
          </div>
          <AgentConsole
            agents={copy.agents.items}
            labels={{
              capability: copy.agents.capability,
              input: copy.agents.input,
              output: copy.agents.output,
              guardrail: copy.agents.guardrail,
              activity: copy.agents.activity,
            }}
          />
        </div>
      </section>

      <section id={ids.modules} className={styles.contentSection} data-kp-section aria-labelledby="modules-title">
        <div className={common.sectionFrame}>
          <div className={styles.sectionIntro} data-kp-reveal>
            <span className={common.kicker}>{copy.modules.kicker}</span>
            <div>
              <h2 id="modules-title">{copy.modules.title}</h2>
              <span className={sales.moduleLabel}>{copy.modules.beta}</span>
            </div>
          </div>
          <div className={sales.moduleGrid} data-kp-reveal>
            {copy.modules.items.map((item, index) => (
              <article key={item.name}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.name}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id={ids.security} className={`${styles.contentSection} ${styles.trustSection}`} data-kp-section aria-labelledby="security-title">
        <div className={`${common.sectionFrame} ${styles.trustGrid}`}>
          <div className={styles.trustCopy} data-kp-reveal>
            <span className={common.kicker}>{copy.trust.kicker}</span>
            <h2 id="security-title">{copy.trust.title}</h2>
            <p>{copy.trust.body}</p>
            <a data-kp-cursor href="#control-log">{copy.trust.link}<span aria-hidden="true">→</span></a>
          </div>
          <div className={styles.controlLog} id="control-log" data-kp-reveal>
            <div className={styles.controlHeader}><span>{copy.trust.logTitle}</span><span><i aria-hidden="true" /> Live</span></div>
            {copy.trust.items.map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <div><h3>{item.title}</h3><p>{item.body}</p></div>
                <strong>{copy.modules.beta}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.contentSection} aria-labelledby="solutions-title">
        <div className={common.sectionFrame}>
          <div className={styles.sectionIntro} data-kp-reveal>
            <span className={common.kicker}>{copy.solutions.kicker}</span>
            <div><h2 id="solutions-title">{copy.solutions.title}</h2></div>
          </div>
          <SolutionsConsole items={copy.solutions.items} />
        </div>
      </section>

      <section id={ids.integrations} className={`${styles.contentSection} ${styles.integrationSection}`} data-kp-section aria-labelledby="integrations-title">
        <div className={common.sectionFrame}>
          <div className={styles.sectionIntro} data-kp-reveal>
            <span className={common.kicker}>{copy.integrations.kicker}</span>
            <div><h2 id="integrations-title">{copy.integrations.title}</h2><p>{copy.integrations.body}</p></div>
          </div>
          <div className={styles.integrationGrid}>
            {copy.integrations.items.map((item, index) => (
              <article data-kp-reveal key={item.name}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{item.name}</h3><p>{item.body}</p></div>
                <i aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={sales.faqSection} aria-labelledby="faq-title">
        <div className={`${common.sectionFrame} ${sales.faqGrid}`}>
          <div className={sales.faqHeading} data-kp-reveal>
            <span>{copy.faq.kicker}</span>
            <h2 id="faq-title">{copy.faq.title}</h2>
          </div>
          <div className={sales.faqList} data-kp-reveal>
            {copy.faq.items.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={sales.closingSection} data-kp-closing aria-labelledby="closing-title">
        <div className={`${common.sectionFrame} ${sales.closingGrid}`}>
          <div className={sales.closingCopy}>
            <span className={sales.closingEyebrow} data-kp-reveal>
              {locale === 'es' ? 'Una demo sobre tu operación' : 'A demo built around your operation'}
            </span>
            <h2 id="closing-title" data-kp-reveal>{copy.closing.title}</h2>
            <p data-kp-reveal>{copy.closing.body}</p>
            <div className={sales.closingActions} data-kp-reveal>
              <a data-kp-cursor data-kp-magnetic href={DEMO_HREF}>{copy.demo}<i aria-hidden="true">↗</i></a>
              <span>{copy.closing.note}</span>
            </div>
          </div>
          <aside className={sales.closingAside} data-kp-reveal>
            <span>{locale === 'es' ? 'Sesión guiada' : 'Guided session'}</span>
            <strong>30</strong>
            <p>{locale === 'es' ? 'minutos para convertir un bloqueo real en un flujo claro.' : 'minutes to turn a real blocker into a clear workflow.'}</p>
          </aside>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={common.sectionFrame}>
          <div className={styles.footerMain}>
            <div><strong>KEKO<span>PILOT</span></strong><p>{copy.footer.body}</p></div>
            {copy.footer.columns.map((column) => (
              <div key={column.title}>
                <span>{column.title}</span>
                {column.links.map((link) => <a data-kp-cursor href={link.href} key={link.href}>{link.label}</a>)}
              </div>
            ))}
          </div>
          <div className={styles.footerBottom}>
            <span>{copy.footer.legal}</span>
            <nav aria-label={locale === 'es' ? 'Enlaces corporativos' : 'Company links'}>
              <a href={SOCIALPRO_URL} rel="noopener noreferrer" target="_blank">SOCIALPRO.ES</a>
              <a href={KEKOPILOT_APP_URL}>APP.KEKOPILOT</a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
