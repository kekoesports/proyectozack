'use client';

import { useState } from 'react';
import { NominasInternasTabla } from './NominasInternasTabla';
import { PagosTalentosTabla } from './PagosTalentosTabla';
import type { InvoiceWithRelations } from '@/types/invoice';

interface Props {
  readonly nominasRows: readonly InvoiceWithRelations[];
  readonly nominasTotal: number;
  readonly talentosRows: readonly InvoiceWithRelations[];
  readonly talentosTotal: number;
  readonly initialTab?: 'nominas' | 'talentos';
}

/**
 * Tabs internos: Nóminas internas / Pagos a talentos.
 * Estado local — el URL param `tipo` de arriba controla el filtrado
 * server-side; los tabs solo cambian qué tabla se muestra.
 */
export function NominasTabsSwitcher({
  nominasRows, nominasTotal, talentosRows, talentosTotal, initialTab = 'nominas',
}: Props): React.ReactElement {
  const [tab, setTab] = useState<'nominas' | 'talentos'>(initialTab);
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-sp-border" role="tablist">
        <TabButton active={tab === 'nominas'} onClick={() => setTab('nominas')}
          label="Nóminas internas" count={nominasRows.length} />
        <TabButton active={tab === 'talentos'} onClick={() => setTab('talentos')}
          label="Pagos a talentos" count={talentosRows.length} />
      </div>
      {tab === 'nominas' ? (
        <NominasInternasTabla rows={nominasRows} totalRows={nominasTotal} />
      ) : (
        <PagosTalentosTabla rows={talentosRows} totalRows={talentosTotal} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly count: number;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
        active
          ? 'border-sp-orange text-sp-orange'
          : 'border-transparent text-sp-muted hover:text-sp-dark hover:border-sp-border'
      }`}
    >
      {label}
      {count > 0 ? (
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
          active ? 'bg-sp-orange/15 text-sp-orange' : 'bg-slate-500/15 text-slate-500'
        }`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
