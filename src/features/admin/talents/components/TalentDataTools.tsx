'use client';

import { useState } from 'react';
import { TalentImporter } from './TalentImporter';
import { TalentExportView } from './TalentExportView';
import type { AdminRosterRow } from '@/lib/queries/talents';
import type { TalentVertical } from '@/types';

export type CurrentTalent = {
  id: number;
  name: string;
  socials: {
    id: number;
    talentId: number;
    platform: string;
    handle: string;
    followersDisplay: string;
    profileUrl: string | null;
    avgViewers: number | null;
  }[];
};

type Tab = 'import' | 'export';

type Props = {
  readonly roster:            readonly CurrentTalent[];
  readonly creators:          readonly AdminRosterRow[];
  readonly verticalsByTalent: Readonly<Record<number, readonly TalentVertical[]>>;
};

const TABS: { key: Tab; label: string; desc: string }[] = [
  {
    key:   'import',
    label: 'Importar archivo',
    desc:  'Sube tu archivo exportado desde Google Sheets o Excel para crear o actualizar talentos con todas sus redes sociales.',
  },
  {
    key:   'export',
    label: 'Exportar talentos',
    desc:  'Selecciona los talentos, plataformas y campos que quieres incluir. Descarga el roster en Excel o CSV.',
  },
];

export function TalentDataTools({ roster: _roster, creators, verticalsByTalent }: Props): React.ReactElement {
  const [tab, setTab] = useState<Tab>('import');
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-5">

      {/* Descripción del módulo */}
      <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sp-admin-accent/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 1Z" stroke="#f5632a" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M9 1v5h5" stroke="#f5632a" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M5 9h6M5 12h4" stroke="#f5632a" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-sp-admin-text">Importar y exportar talentos</p>
            <p className="text-[12px] text-sp-admin-muted mt-0.5">
              Gestiona el roster desde Excel o CSV. Importa nuevos talentos o actualiza los existentes, y exporta los datos en el formato que necesites.
            </p>
          </div>
        </div>
      </div>

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
      {tab === 'export' && (
        <TalentExportView creators={creators} verticalsByTalent={verticalsByTalent} />
      )}
    </div>
  );
}
