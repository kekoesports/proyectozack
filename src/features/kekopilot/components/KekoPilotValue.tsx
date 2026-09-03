import type { KekoPilotLocale } from '../content';
import { getHeroCopy } from '../content';
import common from '../kekopilot-sections.module.css';
import sales from '../kekopilot-sales.module.css';

type KekoPilotValueProps = {
  readonly locale: KekoPilotLocale;
};

export function KekoPilotValue({ locale }: KekoPilotValueProps) {
  const copy = getHeroCopy(locale);
  const sectionId = locale === 'es' ? 'beneficios' : 'benefits';

  return (
    <section
      aria-labelledby="value-title"
      className={sales.valueSection}
      data-kp-section
      id={sectionId}
    >
      <div className={common.sectionFrame}>
        <div className={sales.valueHeader} data-kp-reveal>
          <span className={common.kicker}>{copy.problems.kicker}</span>
          <div>
            <h2 id="value-title">{copy.problems.title}</h2>
            <p>{copy.problems.body}</p>
          </div>
        </div>

        <div className={sales.valueProof} data-kp-reveal>
          <div>
            <span>{locale === 'es' ? 'Nacido de una operación real' : 'Built from a real operation'}</span>
            <p>
              {locale === 'es'
                ? 'Desarrollado desde el día a día de SocialPro: deals, talento, campañas, documentos y finanzas.'
                : 'Developed from SocialPro’s day-to-day work across deals, talent, campaigns, documents and finance.'}
            </p>
          </div>
          <a data-kp-cursor href={locale === 'es' ? '#flujo' : '#flow'}>
            {locale === 'es' ? 'Ver el recorrido' : 'See the workflow'} <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className={sales.valueGrid}>
          {copy.problems.items.map((item, index) => (
            <article data-kp-reveal key={item.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
