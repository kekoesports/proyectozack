'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { SearchIcon } from '@/features/admin/_shared/components/SidebarIcons';
import { trpc } from '@/lib/trpc/client';

import type { GlobalSearchResults, SearchGroup, SearchHit } from '@/lib/queries/search';

const GROUP_LABELS: Record<SearchGroup, string> = {
  brands: 'Marcas',
  campaigns: 'Campañas',
  talents: 'Talentos',
  invoices: 'Facturas',
  tasks: 'Tareas',
  contacts: 'Contactos',
};

const GROUP_ORDER: readonly SearchGroup[] = [
  'brands',
  'campaigns',
  'talents',
  'invoices',
  'tasks',
  'contacts',
];

const EMPTY_RESULTS: GlobalSearchResults = {
  query: '',
  groups: {
    brands: [],
    campaigns: [],
    talents: [],
    invoices: [],
    tasks: [],
    contacts: [],
  },
  tookMs: 0,
};

function flatten(results: GlobalSearchResults): readonly { readonly group: SearchGroup; readonly hit: SearchHit }[] {
  const flat: { group: SearchGroup; hit: SearchHit }[] = [];
  for (const group of GROUP_ORDER) {
    for (const hit of results.groups[group]) {
      flat.push({ group, hit });
    }
  }
  return flat;
}

/**
 * Buscador global del admin (popover) con atajo Cmd/Ctrl+K y resultados agrupados (marcas, campañas, talents, facturas, tareas, contactos) vía búsqueda ILIKE.
 *
 * @kind client
 * @feature admin/_shared
 * @example
 * ```tsx
 * <GlobalSearch />
 * ```
 */
export function GlobalSearch(): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchEnabled = debouncedQuery.trim().length >= 2;

  const { data, isFetching } = trpc.search.global.useQuery(
    { q: debouncedQuery.trim() },
    { enabled: searchEnabled, placeholderData: (prev) => prev },
  );

  const results: GlobalSearchResults = data ?? EMPTY_RESULTS;
  const loading = isFetching;
  const flat = flatten(results);

  // Debounce input → debouncedQuery
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Cmd/Ctrl+K toggles search
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Outside click closes popover
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const goTo = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(flat.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      const target = flat[activeIndex];
      if (target) {
        event.preventDefault();
        goTo(target.hit);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sp-admin-muted pointer-events-none">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar marcas, talentos, campañas… (⌘K)"
        className="w-full h-10 pl-9 pr-12 rounded-lg bg-sp-admin-card border border-sp-admin-border text-[13px] text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-accent/60 transition-colors"
        aria-label="Buscar"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        autoComplete="off"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 rounded border border-sp-admin-border bg-sp-admin-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted">
        ⌘K
      </kbd>

      {open && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-lg"
        >
          {loading && (
            <p className="px-4 py-3 text-xs uppercase tracking-wider text-sp-admin-muted">Buscando…</p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="px-4 py-3 text-xs uppercase tracking-wider text-sp-admin-muted">
              Escribe al menos 2 caracteres
            </p>
          )}
          {!loading && query.trim().length >= 2 && flat.length === 0 && (
            <p className="px-4 py-3 text-sm text-sp-admin-muted">
              Sin resultados para «{query.trim()}»
            </p>
          )}
          {!loading && flat.length > 0 && (
            <div className="divide-y divide-sp-admin-border/60">
              {GROUP_ORDER.map((group) => {
                const hits = results.groups[group];
                if (hits.length === 0) return null;
                return (
                  <section key={group} className="py-2">
                    <h3 className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
                      {GROUP_LABELS[group]}
                    </h3>
                    {hits.map((hit) => {
                      const flatIndex = flat.findIndex((entry) => entry.group === group && entry.hit.id === hit.id);
                      const isActive = flatIndex === activeIndex;
                      return (
                        <button
                          key={`${group}-${hit.id}`}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => goTo(hit)}
                          className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition-colors ${
                            isActive ? 'bg-sp-admin-hover text-sp-admin-text' : 'text-sp-admin-text hover:bg-sp-admin-hover/60'
                          }`}
                        >
                          <span className="text-sm font-medium">{hit.title}</span>
                          {hit.subtitle && (
                            <span className="text-[11px] text-sp-admin-muted">{hit.subtitle}</span>
                          )}
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
