import type { KekoPilotLocale } from '../content';
import { getHeroCopy } from '../content';
import styles from '../kekopilot-sections.module.css';

type KekoPilotStoryProps = {
  readonly locale: KekoPilotLocale;
};

export function KekoPilotStory({ locale }: KekoPilotStoryProps) {
  const copy = getHeroCopy(locale);
  const productId = locale === 'es' ? 'producto' : 'product';
  const flowId = locale === 'es' ? 'flujo' : 'flow';

  return (
    <>
      <section
        id={productId}
        className={styles.pinWrap}
        data-kp-pin-wrap="architecture"
        data-kp-section
        aria-labelledby="architecture-title"
      >
        <div className={styles.pinStage} data-kp-pin-stage>
          <div className={styles.sectionFrame}>
            <div className={styles.sectionHeading} data-kp-reveal>
              <span className={styles.kicker}>{copy.architecture.kicker}</span>
              <h2 id="architecture-title">{copy.architecture.title}</h2>
              <span className={styles.hint}>{copy.architecture.hint}</span>
            </div>
            <div className={styles.architectureRows}>
              <span className={styles.architectureProgress} aria-hidden="true" />
              {copy.architecture.rows.map((row, index) => (
                <div
                  className={styles.architectureRow}
                  data-kp-arch-row
                  data-active={index === 0 ? '' : undefined}
                  key={row.number}
                >
                  <span className={styles.rowNumber}>{row.number}</span>
                  <div>
                    <strong>{row.label}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <span className={styles.rowTag}>{row.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id={flowId}
        className={`${styles.pinWrap} ${styles.flowWrap}`}
        data-kp-pin-wrap="flow"
        data-kp-section
        aria-labelledby="flow-title"
      >
        <div className={`${styles.pinStage} ${styles.flowStage}`} data-kp-pin-stage>
          <div className={styles.sectionFrame}>
            <div className={`${styles.sectionHeading} ${styles.flowHeading}`} data-kp-reveal>
              <div>
                <span className={styles.kicker}>{copy.flow.kicker}</span>
                <h2 id="flow-title">{copy.flow.title}</h2>
              </div>
              <p>{copy.flow.body}</p>
            </div>
            <div className={styles.flowViewport}>
              <div className={styles.flowTrack} data-kp-flow-track>
                {copy.flow.steps.map((step) => (
                  <article className={styles.flowStep} key={step.number}>
                    <div>
                      <span>{step.number}</span>
                      <small>{step.owner}</small>
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    <i aria-hidden="true" />
                  </article>
                ))}
              </div>
            </div>
            <p className={styles.flowFootnote}><i aria-hidden="true" />{copy.flow.footnote}</p>
          </div>
        </div>
      </section>
    </>
  );
}
