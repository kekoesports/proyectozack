'use client';

import { useState } from 'react';
import { TalentImporter } from './TalentImporter';
import { TalentExportView } from './TalentExportView';
import { StatsImportPanel } from '@/components/admin/stats/StatsImportPanel';
import type { CurrentTalent } from '@/lib/statsImport';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';

type Tab = 'import' | 'stats' | 'export';

type Props = {
  readonly roster:            readonly CurrentTalent[];
  readonly creators:          readonly AdminRosterRow[];
  readonly verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>;
};

const TABS: { key: Tab; label: string; desc: string }[] = [
  {
    key:   'import',
    label: 'Importar talentos',
    desc:  'Sube tu Excel o CSV de Google Sheets para crear o actualizar talentos con todas sus redes sociales.',
  },
  {
    key:   'stats',
    label: 'Actualizar estadísticas',
    desc:  'Importa followers, CCV y URLs para talentos ya existentes en el CRM.',
  },
  {
    key:   'export',
    label: 'Exportar Excel',
    desc:  'Selecciona los influencers y descarga el roster en Excel con branding SocialPro.',
  },
];

export function TalentDataTools({ roster, creators, verticalsByTalent }: Props): React.ReactElement {
  const [tab, setTab] = useState<Tab>('import');
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex items-end gap-0 border-b border-sp-admin-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`
              px-4 py-2.5 text-[12px] font-semibold transition-colors relative shrink-0
              ${tab === t.key
                ? 'text-sp-admin-accent after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:bg-sp-admin-accent after:rounded-t'
                : 'text-sp-admin-muted hover:text-sp-admin-text'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-sp-admin-muted -mt-2">{active.desc}</p>

      {tab === 'import' && <TalentImporter />}
      {tab === 'stats'  && <StatsImportPanel roster={roster} />}
      {tab === 'export' && <TalentExportView creators={creators} verticalsByTalent={verticalsByTalent} />}
    </div>
  );
}
