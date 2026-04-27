'use client';

import { useMemo, useState } from 'react';
import type { CrmTaskRelatedType } from '@/types';

export type RelatedOption = {
  readonly id: number;
  readonly label: string;
};

export type RelatedOptions = {
  readonly brand: readonly RelatedOption[];
  readonly talent: readonly RelatedOption[];
  readonly campaign: readonly RelatedOption[];
  readonly invoice: readonly RelatedOption[];
  readonly general: readonly RelatedOption[];
};

const TYPE_LABELS: Record<CrmTaskRelatedType, string> = {
  brand: 'Marca',
  talent: 'Talent',
  campaign: 'Campaña',
  invoice: 'Factura',
  general: 'General',
};

type Props = {
  readonly options: RelatedOptions;
  readonly initialType: CrmTaskRelatedType | null;
  readonly initialId: number | null;
};

const inputCls =
  'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:border-sp-admin-accent focus:outline-none';

export function RelatedSelector({ options, initialType, initialId }: Props): React.ReactElement {
  const [type, setType] = useState<CrmTaskRelatedType | ''>(initialType ?? '');
  const [id, setId] = useState<number | ''>(initialId ?? '');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    if (!type) return [];
    const all = options[type];
    const q = search.toLowerCase().trim();
    if (!q) return all;
    return all.filter((o) => o.label.toLowerCase().includes(q));
  }, [type, options, search]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="relatedType" value={type} />
      <input type="hidden" name="relatedId" value={id} />

      <div className="grid grid-cols-3 gap-2">
        <label className={`px-3 py-2 rounded-lg border cursor-pointer text-xs font-semibold text-center transition-colors ${type === '' ? 'bg-sp-admin-accent/10 border-sp-admin-accent text-sp-admin-accent' : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'}`}>
          <input type="radio" name="relatedTypePicker" checked={type === ''} onChange={() => { setType(''); setId(''); }} className="sr-only" />
          Ninguna
        </label>
        {(['brand', 'talent', 'campaign', 'invoice', 'general'] as const).map((k) => (
          <label key={k} className={`px-3 py-2 rounded-lg border cursor-pointer text-xs font-semibold text-center transition-colors ${type === k ? 'bg-sp-admin-accent/10 border-sp-admin-accent text-sp-admin-accent' : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'}`}>
            <input type="radio" name="relatedTypePicker" checked={type === k} onChange={() => { setType(k); setId(''); }} className="sr-only" />
            {TYPE_LABELS[k]}
          </label>
        ))}
      </div>

      {type && type !== 'general' && (
        <>
          <input
            type="search"
            placeholder={`Buscar ${TYPE_LABELS[type].toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls}
          />
          <div className="max-h-40 overflow-y-auto rounded-lg border border-sp-admin-border bg-sp-admin-bg">
            {list.length === 0 ? (
              <p className="px-3 py-2 text-xs italic text-sp-admin-muted">Sin resultados.</p>
            ) : (
              list.map((o) => {
                const isSel = id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setId(o.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer ${isSel ? 'bg-sp-admin-accent/15 text-sp-admin-accent font-semibold' : 'text-sp-admin-text hover:bg-sp-admin-hover'}`}
                  >
                    {o.label}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
