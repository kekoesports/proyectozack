'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CrmBrandPickerEntry } from '@/lib/queries/crmBrands';

type Props = {
  readonly brands:       readonly CrmBrandPickerEntry[];
  readonly onSelect:     (brand: CrmBrandPickerEntry) => void;
  readonly onClear?:     () => void;
  readonly placeholder?: string;
};

export function BrandPicker({ brands, onSelect, onClear, placeholder = 'Seleccionar marca…' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setOpen(false); onClear?.(); }}
            className="px-2 text-sp-admin-muted hover:text-sp-admin-text text-sm">✕</button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {filtered.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onSelect(b); setQuery(b.name); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sp-admin-hover transition-colors text-left"
            >
              {b.logoUrl ? (
                <div className="w-7 h-7 rounded bg-sp-admin-bg border border-sp-admin-border flex items-center justify-center overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.logoUrl} alt={b.name} className="w-full h-full object-contain p-0.5" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded bg-sp-admin-border/40 flex items-center justify-center text-[9px] text-sp-admin-muted font-bold shrink-0">
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sp-admin-text truncate">{b.name}</p>
                {b.category && <p className="text-[10px] text-sp-admin-muted">{b.category}</p>}
              </div>
              {b.mainUrl && <span className="text-[10px] text-sp-admin-muted shrink-0">con URL ✓</span>}
            </button>
          ))}
          <div className="px-3 py-2 border-t border-sp-admin-border bg-sp-admin-bg/50">
            <p className="text-[10px] text-sp-admin-muted">
              {filtered.length} marca{filtered.length !== 1 ? 's' : ''} · Gestionar en <Link href="/admin/brands" className="text-sp-admin-accent hover:underline">CRM Marcas</Link>
            </p>
          </div>
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
