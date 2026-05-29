'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditDrawer } from '@/features/admin/_shared/components/EditDrawer';
import { StatsCards } from './StatsCards';
import { GiveawaysTab } from './GiveawaysTab';
import { CodesTab } from './CodesTab';
import { WinnersTab } from './WinnersTab';
import { BrandsTab } from './BrandsTab';
import { CreateGiveawayForm } from './CreateGiveawayForm';
import { CreateCodeForm } from './CreateCodeForm';
import { CreateWinnerForm } from './CreateWinnerForm';
import type { GiveawayWithTalent, CreatorCodeWithTalent, GiveawayWinnerWithGiveaway } from '@/types';
import type { BrandCatalogEntry } from './brand-actions';
import type { CrmBrandPickerEntry } from '@/lib/queries/crmBrands';

type Tab = 'sorteos' | 'codigos' | 'ganadores' | 'marcas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sorteos',   label: 'Sorteos' },
  { id: 'codigos',   label: 'Códigos' },
  { id: 'ganadores', label: 'Ganadores' },
  { id: 'marcas',    label: 'Marcas' },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.id));

function parseTab(value: string | null): Tab {
  if (value !== null && VALID_TABS.has(value)) return value as Tab;
  return 'sorteos';
}

type Props = {
  readonly giveaways:   readonly GiveawayWithTalent[];
  readonly talents:     readonly GiveawayWithTalent['talent'][];
  readonly codes:       readonly CreatorCodeWithTalent[];
  readonly winners:     readonly GiveawayWinnerWithGiveaway[];
  readonly brands:      readonly CrmBrandPickerEntry[];    // para el picker
  readonly brandCatalog: readonly BrandCatalogEntry[];     // para BrandsTab (brand_catalog)
};

export function GiveawaysDashboard({
  giveaways,
  talents,
  codes,
  winners,
  brands,
  brandCatalog,
}: Props): React.ReactElement {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const activeTab     = parseTab(searchParams.get('tab'));

  const [newGiveawayOpen, setNewGiveawayOpen] = useState(false);
  const [newCodeOpen,     setNewCodeOpen]     = useState(false);
  const [newWinnerOpen,   setNewWinnerOpen]   = useState(false);

  function setTab(tab: Tab): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text leading-none">
            Sorteos
          </h1>
          <p className="text-sm text-sp-admin-muted mt-1">
            Gestiona sorteos, códigos de creadores y ganadores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewGiveawayOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sp-orange text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          + Nuevo sorteo
        </button>
      </div>

      {/* Stats */}
      <StatsCards giveaways={giveaways} codes={codes} winners={winners} />

      {/* Tab bar */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 p-1 rounded-xl bg-sp-admin-card border border-sp-admin-border w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-sp-admin-accent text-white'
                  : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'sorteos' && (
          <GiveawaysTab
            giveaways={giveaways}
            brands={brands}
            onNewGiveaway={() => setNewGiveawayOpen(true)}
          />
        )}
        {activeTab === 'codigos' && (
          <CodesTab
            codes={codes}
            talents={talents}
            brands={brands}
            onNewCode={() => setNewCodeOpen(true)}
          />
        )}
        {activeTab === 'ganadores' && (
          <WinnersTab
            winners={winners}
            onRegisterWinner={() => setNewWinnerOpen(true)}
          />
        )}
        {activeTab === 'marcas' && (
          <BrandsTab brands={brandCatalog} />
        )}
      </div>

      {/* Drawer — Nuevo sorteo */}
      <EditDrawer
        isOpen={newGiveawayOpen}
        onClose={() => setNewGiveawayOpen(false)}
        title="Nuevo sorteo"
      >
        <CreateGiveawayForm talents={talents} />
      </EditDrawer>

      {/* Drawer — Nuevo código */}
      <EditDrawer
        isOpen={newCodeOpen}
        onClose={() => setNewCodeOpen(false)}
        title="Nuevo código"
      >
        <CreateCodeForm talents={talents} brandCatalog={brands} />
      </EditDrawer>

      {/* Drawer — Registrar ganador */}
      <EditDrawer
        isOpen={newWinnerOpen}
        onClose={() => setNewWinnerOpen(false)}
        title="Registrar ganador"
      >
        <CreateWinnerForm giveaways={giveaways} />
      </EditDrawer>
    </div>
  );
}
