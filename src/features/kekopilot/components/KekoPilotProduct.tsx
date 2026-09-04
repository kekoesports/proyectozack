import type { KekoPilotLocale } from '../content';
import { SOCIALPRO_URL } from '../content';
import { getProductConsoleCopy, getProductCopy } from '../product-content';
import { KekoPilotProductConsole } from './KekoPilotProductConsole';
import common from '../kekopilot-sections.module.css';
import styles from '../kekopilot-product.module.css';

type KekoPilotProductProps = {
  readonly locale: KekoPilotLocale;
};

export function KekoPilotPromise({ locale }: KekoPilotProductProps) {
  const copy = getProductCopy(locale).promise;

  return (
    <section className={styles.promiseSection} data-kp-section aria-labelledby="promise-title">
      <div className={common.sectionFrame}>
        <div className={styles.promiseLead} data-kp-reveal>
          <h2 id="promise-title">
            <span>{copy.lineOne}</span>
            <span>{copy.lineTwo}</span>
          </h2>
          <p>{copy.body}</p>
        </div>
        <div className={styles.promiseRules} data-kp-reveal>
          {copy.rules.map((rule) => (
            <article key={rule.label}>
              <span>{rule.label}</span>
              <h3>{rule.title}</h3>
              <p>{rule.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KekoPilotProduct({ locale }: KekoPilotProductProps) {
  const copy = getProductCopy(locale);
  const productId = locale === 'es' ? 'producto' : 'product';

  return (
    <section
      className={styles.productSection}
      data-kp-section
      id={productId}
      aria-labelledby="product-title"
    >
      <div className={common.sectionFrame}>
        <div className={styles.productIntro} data-kp-reveal>
          <span className={common.kicker}>{copy.showcase.kicker}</span>
          <div>
            <h2 id="product-title">{copy.showcase.title}</h2>
            <p>{copy.showcase.body}</p>
          </div>
        </div>

        <KekoPilotProductConsole copy={getProductConsoleCopy(locale)} locale={locale} />

        <div className={styles.productSummary} data-kp-reveal>
          {copy.showcase.summary.map((item) => (
            <article key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.socialProof} data-kp-reveal>
          <div>
            <span>{copy.socialProof.label}</span>
            <p>{copy.socialProof.body}</p>
          </div>
          <a data-kp-cursor href={SOCIALPRO_URL} rel="noopener noreferrer" target="_blank">
            {copy.socialProof.link} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
