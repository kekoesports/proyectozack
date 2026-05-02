'use client';

import { useMemo, useState, useTransition } from 'react';
import type { PressTarget, PressTargetCategory, PressTargetOutreachStatus } from '@/types';
import { updatePressTargetStatusAction } from '@/app/admin/(dashboard)/prensa-targets/actions';

const CATEGORY_LABELS: Record<PressTargetCategory, string> = {
  'gaming-generalista': 'Gaming Generalista',
  'cs2-fps': 'CS2 / FPS',
  'igaming-skins': 'iGaming / Skins',
  'prensa-local': 'Prensa Local',
  foro: 'Foro',
  periodista: 'Periodista',
  otro: 'Otro',
};

const STATUS_META: Record<PressTargetOutreachStatus, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'border-amber-500/40 text-amber-400'   },
  contactado: { label: 'Contactado', color: 'border-blue-500/40 text-blue-400'     },
  respondido: { label: 'Respondido', color: 'border-purple-500/40 text-purple-400' },
  publicado:  { label: 'Publicado',  color: 'border-emerald-500/40 text-emerald-400' },
  descartado: { label: 'Descartado', color: 'border-zinc-500/40 text-zinc-400'     },
};

type CategoryFilter = PressTargetCategory | 'all';
type StatusFilter = PressTargetOutreachStatus | 'all';

function isStatus(v: string): v is PressTargetOutreachStatus {
  return v in STATUS_META;
}

function isCategoryFilter(v: string): v is CategoryFilter {
  return v === 'all' || v in CATEGORY_LABELS;
}

function isStatusFilter(v: string): v is StatusFilter {
  return v === 'all' || v in STATUS_META;
}

export function PressTargetsTable({ items }: { items: PressTarget[] }): React.ReactElement {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && it.outreachStatus !== statusFilter) return false;
      if (q && !`${it.name} ${it.domain} ${it.region}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const onStatusChange = (item: PressTarget, raw: string): void => {
    if (!isStatus(raw) || raw === item.outreachStatus) return;
    startTransition(async () => {
      await updatePressTargetStatusAction({ id: item.id, status: raw });
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
        Sin entradas todavía. Ejecuta <code className="text-sp-admin-text">/socialpro-press-targets</code> en Claude, valida candidatos en <code className="text-sp-admin-text">~/.claude/skills/socialpro-press-targets/targets.md</code> moviéndolos a las secciones <code className="text-sp-admin-text">## Curados —</code>, y haz <code className="text-sp-admin-text">git push</code> — el hook sincroniza esta tabla.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre, dominio o región…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-text/40"
        />
        <select
          value={categoryFilter}
          onChange={(e) => { if (isCategoryFilter(e.target.value)) setCategoryFilter(e.target.value); }}
          className="px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text"
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { if (isStatusFilter(e.target.value)) setStatusFilter(e.target.value); }}
          className="px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_META).map(([k, { label }]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="text-xs text-sp-admin-muted tabular-nums">
        {filtered.length} de {items.length}
      </div>

      <div className="overflow-x-auto rounded-lg border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full text-sm">
          <thead className="bg-sp-admin-bg2 text-xs uppercase text-sp-admin-muted">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Nombre</th>
              <th className="text-left px-3 py-2 font-semibold">Categoría</th>
              <th className="text-left px-3 py-2 font-semibold">Región</th>
              <th className="text-left px-3 py-2 font-semibold">Submission</th>
              <th className="text-left px-3 py-2 font-semibold">Estado</th>
              <th className="text-left px-3 py-2 font-semibold">Validado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} className="border-t border-sp-admin-border/50 hover:bg-sp-admin-bg2/40">
                <td className="px-3 py-2 align-top">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sp-admin-text hover:underline font-medium"
                  >
                    {it.name}
                  </a>
                  <div className="text-xs text-sp-admin-muted">{it.domain}</div>
                  {it.summary ? (
                    <div className="text-xs text-sp-admin-muted mt-1 max-w-md">{it.summary}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top text-sp-admin-text">{CATEGORY_LABELS[it.category]}</td>
                <td className="px-3 py-2 align-top text-sp-admin-text">{it.region}</td>
                <td className="px-3 py-2 align-top text-sp-admin-text font-mono text-xs break-all max-w-[260px]">
                  {it.submission}
                </td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={it.outreachStatus}
                    onChange={(e) => onStatusChange(it, e.target.value)}
                    className={`text-xs px-2 py-1 rounded border bg-transparent ${STATUS_META[it.outreachStatus].color}`}
                  >
                    {Object.entries(STATUS_META).map(([k, { label }]) => (
                      <option key={k} value={k} className="bg-sp-admin-card text-sp-admin-text">{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 align-top text-sp-admin-muted text-xs tabular-nums">
                  {it.validatedAt ? new Date(it.validatedAt).toISOString().slice(0, 10) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
