'use client';

import { useState, useMemo } from 'react';
import type { FAQ_ITEMS } from './page';

type Item = (typeof FAQ_ITEMS)[number];
type Props = { items: readonly Item[] };

const CATEGORIES = ['Todos', 'Códigos', 'Sorteos', 'Marcas', 'SocialPro'] as const;

export function FaqClient({ items }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('Todos');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchCat = category === 'Todos' || item.category === category;
      const matchSearch = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [items, search, category]);

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(null); }}
          placeholder="Buscar pregunta..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-white/25 outline-none focus:border-sp-orange/50 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-lg leading-none">×</button>
        )}
      </div>

      {/* Filtros de categoría */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setOpen(null); }}
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              category === cat
                ? 'bg-sp-orange text-white'
                : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.10] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de preguntas */}
      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-8 text-center">No hay preguntas que coincidan con tu búsqueda.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <div key={idx} className={`rounded-xl border transition-colors ${isOpen ? 'border-white/[0.12] bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.09]'}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-bold text-sm text-white/90 leading-snug">{item.q}</span>
                  <span className={`shrink-0 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} aria-hidden>+</span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm text-white/55 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-white/20 text-right pt-2">
        {filtered.length} de {items.length} preguntas
      </p>
    </div>
  );
}
