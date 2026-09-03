'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { InboxFilter, KekoPilotPanelData, Tone } from './data';
import styles from './panel.module.css';

const FILTERS: ReadonlyArray<InboxFilter> = ['Todo', 'Aprobaciones', 'Bloqueos', 'Errores'];

function toneClass(tone: Tone): string {
  return styles[`tone-${tone}`] ?? '';
}

type CommandCenterProps = {
  readonly data: KekoPilotPanelData;
  readonly searchQuery: string;
};

export function CommandCenter({ data, searchQuery }: CommandCenterProps) {
  const [filter, setFilter] = useState<InboxFilter>('Todo');
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
  const visibleItems = data.inbox.filter((item) => {
    const matchesFilter = filter === 'Todo' || item.category === filter;
    const matchesSearch = normalizedQuery.length === 0 || [item.title, item.body, item.owner, item.evidence]
      .some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className={styles.commandCenter}>
      <section className={styles.metrics} aria-label="Resumen operativo">
        {data.metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <div><strong className={toneClass(metric.tone)}>{metric.value}</strong><small>{metric.note}</small></div>
          </article>
        ))}
      </section>

      <div className={styles.commandGrid}>
        <section className={styles.inbox} aria-labelledby="inbox-title">
          <header className={styles.sectionBar}>
            <div><h2 id="inbox-title">Bandeja unificada</h2><span>Prioridad · responsable · evidencia · acción</span></div>
            <div className={styles.filters} aria-label="Filtrar bandeja">
              {FILTERS.map((item) => (
                <button aria-pressed={filter === item} key={item} onClick={() => setFilter(item)} type="button">{item}</button>
              ))}
            </div>
          </header>

          <div className={styles.inboxScroller}>
            <div className={styles.inboxRows} aria-live="polite">
              {visibleItems.map((item) => (
                <article className={styles.inboxRow} key={item.id}>
                  <span className={styles.priority} data-priority={item.priority}>{item.priority}</span>
                  <div className={styles.inboxCopy}>
                    <div><span className={`${styles.stateChip} ${toneClass(item.tone)}`}>{item.state}</span><h3>{item.title}</h3></div>
                    <p>{item.body}</p>
                    <small>Evidencia · {item.evidence}</small>
                  </div>
                  <span className={styles.owner}>{item.owner}</span>
                  <span className={styles.due}>{item.due}</span>
                  <Link className={styles.rowAction} href={item.href}>{item.action}</Link>
                </article>
              ))}
              {visibleItems.length === 0 ? <p className={styles.empty}>No hay elementos reales en este filtro.</p> : null}
            </div>
          </div>
          <footer className={styles.inboxFooter}>Los datos se leen de SocialPro; las acciones se ejecutan en el CRM con sus permisos y auditoría.</footer>
        </section>

        <aside className={styles.sidePanels} aria-label="Señales del sistema">
          {data.sidePanels.map((panel) => (
            <section key={panel.title}>
              <header><h2>{panel.title}</h2><span>{panel.meta}</span></header>
              {panel.rows.map((row) => {
                const content = <><div><strong>{row.title}</strong><span>{row.body}</span></div><small className={toneClass(row.tone)}>{row.value}</small></>;
                return row.href
                  ? <Link href={row.href} key={`${panel.title}-${row.title}`}>{content}</Link>
                  : <article key={`${panel.title}-${row.title}`}>{content}</article>;
              })}
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
