'use client';

import { useState } from 'react';
import type { KekoPilotPanelData } from './data';
import styles from './product.module.css';

const FILTERS = ['Todos', 'Míos', 'Bloqueados', 'Aprobación', 'Cerrados'] as const;
type PipelineFilter = typeof FILTERS[number];

type DealsPipelineProps = {
  readonly activeDealId: string;
  readonly data: KekoPilotPanelData['pipeline'];
  readonly onOpenDeal: (dealId: string) => void;
  readonly searchQuery: string;
};

function matchesFilter(filter: PipelineFilter, flags: KekoPilotPanelData['pipeline']['stages'][number]['deals'][number]['flags']): boolean {
  if (filter === 'Míos') return flags.mine;
  if (filter === 'Bloqueados') return flags.blocked;
  if (filter === 'Aprobación') return flags.approval;
  if (filter === 'Cerrados') return flags.closed;
  return true;
}

export function DealsPipeline({ activeDealId, data, onOpenDeal, searchQuery }: DealsPipelineProps) {
  const [filter, setFilter] = useState<PipelineFilter>('Todos');
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
  const stages = data.stages.map((stage) => ({
    ...stage,
    deals: stage.deals.filter((deal) => {
      const matchesSearch = normalizedQuery.length === 0 || [deal.ref, deal.name, deal.creator, deal.brand]
        .some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery));
      return matchesFilter(filter, deal.flags) && matchesSearch;
    }),
  }));

  return (
    <section className={styles.pipeline} aria-label="Pipeline de deals">
      <header className={styles.pipelineHeader}>
        <div className={styles.productFilters} aria-label="Filtrar pipeline">
          {FILTERS.map((item) => <button aria-pressed={filter === item} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}
        </div>
        <dl className={styles.pipelineTotals}>
          <div><dt>Pipeline EUR</dt><dd>{data.total}</dd></div>
          <div><dt>Margen medio</dt><dd>{data.averageMargin}</dd></div>
          <div><dt>Bloqueados</dt><dd>{data.blocked}</dd></div>
        </dl>
      </header>

      <div className={styles.boardScroller}>
        <div className={styles.board}>
          {stages.map((stage) => (
            <section className={styles.stage} key={stage.name}>
              <header><h2>{stage.name}</h2><span>{stage.deals.length} deals</span><strong>{stage.total}</strong></header>
              <div>
                {stage.deals.map((deal) => (
                  <button
                    aria-label={`Abrir ${deal.ref}: ${deal.creator} con ${deal.brand}`}
                    className={styles.dealCard}
                    data-active={activeDealId === deal.id ? 'true' : undefined}
                    key={deal.id}
                    onClick={() => onOpenDeal(deal.id)}
                    type="button"
                  >
                    <span className={styles.dealCardTop}><i data-tone={deal.tone}>{deal.state}</i><small>{deal.ref}</small></span>
                    <strong>{deal.creator}</strong><em>{deal.brand}</em><span className={styles.dealName}>{deal.name}</span>
                    <span className={styles.dealFigures}><b>{deal.amount}</b><small>Margen {deal.margin}</small><i>{deal.owner}</i></span>
                    <span className={styles.progress}><i style={{ width: `${deal.progress}%` }} /></span>
                    <span className={styles.dealAlert} data-tone={deal.tone}>{deal.alert}</span>
                  </button>
                ))}
                {stage.deals.length === 0 ? <p className={styles.stageEmpty}>Sin deals para este filtro.</p> : null}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
