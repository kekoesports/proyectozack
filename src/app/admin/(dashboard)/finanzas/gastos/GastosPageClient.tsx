'use client';

import { useState } from 'react';
import { ExpensesClassifyTable } from '@/features/admin/finance-dashboard/components/ExpensesClassifyTable';
import type { InvoiceWithRelations } from '@/types/invoice';

type Props = {
  readonly directos: readonly InvoiceWithRelations[];
  readonly operativos: readonly InvoiceWithRelations[];
  readonly sinClasificar: readonly InvoiceWithRelations[];
};

const TABS = ['Directos', 'Operativos', 'Sin clasificar'] as const;
type TabName = (typeof TABS)[number];

export function GastosPageClient({ directos, operativos, sinClasificar }: Props): React.ReactElement {
  const [active, setActive] = useState<TabName>('Directos');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-sp-border">
        {TABS.map((tab) => {
          const count =
            tab === 'Directos' ? directos.length
            : tab === 'Operativos' ? operativos.length
            : sinClasificar.length;
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-sp-orange text-sp-orange'
                  : 'border-transparent text-sp-admin-muted hover:text-sp-admin-fg'
              }`}
            >
              {tab}
              {count > 0 && (
                <span
                  className={`ml-1.5 rounded px-1 py-0.5 text-[10px] font-semibold ${
                    tab === 'Sin clasificar'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-sp-admin-border text-sp-admin-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active === 'Directos' && (
        <ExpensesClassifyTable
          invoices={directos}
          title="Costes directos de campaña"
          showClassify={false}
        />
      )}
      {active === 'Operativos' && (
        <ExpensesClassifyTable
          invoices={operativos}
          title="Gastos operativos"
          showClassify
        />
      )}
      {active === 'Sin clasificar' && (
        sinClasificar.length === 0 ? (
          <p className="text-sm text-sp-admin-muted py-6 text-center">
            No hay gastos sin clasificar. ¡Todo en orden!
          </p>
        ) : (
          <ExpensesClassifyTable
            invoices={sinClasificar}
            title="Sin clasificar"
            showClassify
          />
        )
      )}
    </div>
  );
}
