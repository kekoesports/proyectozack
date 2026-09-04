'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { KekoPilotLocale } from '../content';
import type { ProductConsoleCopy, ProductTone } from '../product-content';
import styles from '../kekopilot-product-console.module.css';

type ProductConsoleProps = {
  readonly copy: ProductConsoleCopy;
  readonly locale: KekoPilotLocale;
};

function Status({ label, tone }: { readonly label: string; readonly tone: ProductTone }) {
  return <span className={styles.status} data-tone={tone}>{label}</span>;
}

function QueueScreen({ copy, locale }: ProductConsoleProps) {
  return (
    <div className={styles.queueScreen}>
      <div className={styles.screenMetrics}>
        <span><strong>7</strong>{locale === 'es' ? 'Decisiones' : 'Decisions'}</span>
        <span><strong>3</strong>{locale === 'es' ? 'Bloqueos' : 'Blockers'}</span>
        <span><strong>5</strong>{locale === 'es' ? 'Documentos' : 'Documents'}</span>
      </div>
      <div className={styles.queueList}>
        {copy.queue.map((item) => (
          <article key={`${item.agent}-${item.title}`}>
            <Status label={item.status} tone={item.tone} />
            <div><strong>{item.title}</strong><span>{item.agent}</span></div>
            <i aria-hidden="true">→</i>
          </article>
        ))}
      </div>
    </div>
  );
}

function PipelineScreen({ copy }: ProductConsoleProps) {
  return (
    <div className={styles.pipelineScreen}>
      {copy.pipeline.map((column) => (
        <section key={column.name}>
          <header><span>{column.name}</span><strong>{column.total}</strong></header>
          <div>
            {column.deals.map((deal) => (
              <article key={deal.reference}>
                <span className={styles.dealTopline}><Status label={deal.status} tone={deal.tone} /><small>{deal.reference}</small></span>
                <h3>{deal.creator}</h3>
                <p>{deal.brand}</p>
                <span className={styles.dealMeta}><strong>{deal.amount}</strong><small>{deal.alert}</small></span>
                <i aria-hidden="true"><span style={{ width: deal.progress }} /></i>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DealScreen({ copy: productCopy, locale }: ProductConsoleProps) {
  const copy = productCopy.deal;

  return (
    <div className={styles.dealScreen}>
      <header>
        <div><span>{copy.stage}</span><h3>{copy.creator}</h3><p>{copy.brand}</p></div>
        <dl>{copy.figures.map((figure) => <div key={figure.label}><dt>{figure.label}</dt><dd>{figure.value}</dd></div>)}</dl>
      </header>
      <div className={styles.approvalBand}>
        <span>{locale === 'es' ? 'Pendiente de aprobación · Zack Deal Clerk' : 'Pending approval · Zack Deal Clerk'}</span>
        <strong>{copy.approval}</strong>
      </div>
      <div className={styles.dealColumns}>
        <section>
          <h4>{copy.deliverablesLabel}</h4>
          {copy.deliverables.map((item) => (
            <div className={styles.deliverable} key={item.title}>
              <i aria-hidden="true">{item.done ? '✓' : '○'}</i><span>{item.title}</span><small>{item.date}</small><strong>{item.status}</strong>
            </div>
          ))}
        </section>
        <section>
          <h4>{copy.activityLabel}</h4>
          {copy.activity.map((item) => (
            <div className={styles.activity} key={`${item.when}-${item.status}`}>
              <span><Status label={item.status} tone={item.tone} /><small>{item.when}</small></span>
              <p>{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function KekoPilotProductConsole({ copy: productCopy, locale }: ProductConsoleProps) {
  const copy = productCopy.showcase;
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeScreen = copy.screens[activeIndex] ?? copy.screens[0];

  if (!activeScreen) return null;

  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? copy.screens.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + copy.screens.length) % copy.screens.length;
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={styles.productConsole} data-kp-reveal>
      <div className={styles.productTabs} role="tablist" aria-label={copy.kicker}>
        {copy.screens.map((screen, index) => (
          <button
            aria-controls="kp-product-panel"
            aria-selected={activeIndex === index}
            data-kp-cursor
            id={`kp-product-tab-${index}`}
            key={screen.title}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => moveTabFocus(event, index)}
            ref={(node) => { tabRefs.current[index] = node; }}
            role="tab"
            tabIndex={activeIndex === index ? 0 : -1}
            type="button"
          >
            <span>0{index + 1}</span>{screen.title}
          </button>
        ))}
        <span className={styles.demoLabel}><i aria-hidden="true" />{copy.demoLabel}</span>
      </div>

      <div className={styles.productViewport}>
        <div
          aria-labelledby={`kp-product-tab-${activeIndex}`}
          className={styles.productPanel}
          id="kp-product-panel"
          key={activeScreen.crumb}
          role="tabpanel"
          tabIndex={0}
        >
          <div className={styles.screenBar}><span>KekoPilot</span><span>{activeScreen.crumb}</span></div>
          {activeIndex === 0 ? <QueueScreen copy={productCopy} locale={locale} /> : null}
          {activeIndex === 1 ? <PipelineScreen copy={productCopy} locale={locale} /> : null}
          {activeIndex === 2 ? <DealScreen copy={productCopy} locale={locale} /> : null}
        </div>

        <aside className={styles.screenNotes}>
          <span>{copy.notesLabel}</span>
          {activeScreen.notes.map((note) => (
            <article key={note.number}>
              <i>{note.number}</i>
              <div><h3>{note.title}</h3><p>{note.body}</p></div>
            </article>
          ))}
          <p className={styles.disclaimer}>{copy.disclaimer}</p>
        </aside>
      </div>
    </div>
  );
}
