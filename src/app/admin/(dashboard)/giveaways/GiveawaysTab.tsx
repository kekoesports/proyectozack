'use client';

import { useState } from 'react';
import Image from 'next/image';
import { EditGiveawayModal } from './EditGiveawayModal';
import { DeleteConfirmButton } from './DeleteConfirmButton';
import {
  deleteGiveawayAction,
  deleteAllDemosAction,
  setGiveawayFeaturedAction,
  setGiveawayBadgeAction,
  setGiveawayBadgeFromFormAction,
} from './actions';
import type { GiveawayWithTalent } from '@/types';
import type { BrandCatalogEntry } from './brand-actions';

type StatusFilter = 'all' | 'active' | 'finished';

type Props = {
  readonly giveaways: readonly GiveawayWithTalent[];
  readonly brands:    readonly BrandCatalogEntry[];
  readonly onNewGiveaway: () => void;
};

function isGiveawayActive(endsAt: Date | null): boolean {
  return endsAt === null || new Date(endsAt) > new Date();
}

const BADGE_OPTIONS = ['HOT', 'NUEVO', 'EXCLUSIVO', 'TOP', 'LIMITED'] as const;
type BadgeOption = typeof BADGE_OPTIONS[number];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all',      label: 'Todos' },
  { id: 'active',   label: 'Activo' },
  { id: 'finished', label: 'Finalizado' },
];

export function GiveawaysTab({ giveaways, brands, onNewGiveaway }: Props): React.ReactElement {
  const [query,  setQuery]  = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const hasDemos = giveaways.some((g) => g.title.startsWith('[DEMO]'));

  const filtered = giveaways.filter((g) => {
    if (status === 'active'   && !isGiveawayActive(g.endsAt)) return false;
    if (status === 'finished' &&  isGiveawayActive(g.endsAt)) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.brandName.toLowerCase().includes(q) ||
        g.talent.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sp-admin-muted pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por título, marca o creador…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-sp-admin-border bg-sp-admin-bg text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-accent transition-colors"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 p-1 rounded-lg bg-sp-admin-card border border-sp-admin-border">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                status === f.id
                  ? 'bg-sp-admin-accent text-white'
                  : 'text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

      </div>

      {/* Demo banner */}
      {hasDemos && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5">
          <span className="text-xs font-bold text-amber-400 flex-1">
            Hay sorteos [DEMO] visibles en el admin. No aparecen en la web pública.
          </span>
          <form action={deleteAllDemosAction}>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-black hover:bg-amber-500/30 transition-colors"
            >
              Eliminar todos los demos
            </button>
          </form>
        </div>
      )}

      {/* Empty states */}
      {filtered.length === 0 && giveaways.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-sm text-sp-admin-muted">No hay sorteos. Crea el primero.</p>
          <button
            type="button"
            onClick={onNewGiveaway}
            className="px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Nuevo sorteo
          </button>
        </div>
      )}

      {filtered.length === 0 && giveaways.length > 0 && (
        <div className="py-10 text-center text-sm text-sp-admin-muted">
          Sin resultados para los filtros actuales.
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <div className="px-6 py-3 border-b border-sp-admin-border bg-sp-admin-bg/50">
            <span className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wider">
              {query.trim() || status !== 'all'
                ? `${filtered.length} / ${giveaways.length} sorteos`
                : `${giveaways.length} sorteo${giveaways.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Imagen</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Premio</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Creador</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Marca</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fin</th>
                  <th className="text-center px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Dest.</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Badge</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <GiveawayRow key={g.id} giveaway={g} brands={brands} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row sub-component (keeps main component <500 LOC) ─────────────────────────

type RowProps = {
  readonly giveaway: GiveawayWithTalent;
  readonly brands:   readonly BrandCatalogEntry[];
};

function GiveawayRow({ giveaway: g, brands }: RowProps): React.ReactElement {
  const active = isGiveawayActive(g.endsAt);

  return (
    <tr
      className={`border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors ${
        g.title.startsWith('[DEMO]') ? 'bg-amber-500/5' : ''
      }`}
    >
      {/* Thumbnail */}
      <td className="px-4 py-3">
        {g.imageUrl ? (
          <Image
            src={g.imageUrl}
            alt={g.title}
            width={48}
            height={36}
            className="rounded object-contain bg-sp-admin-bg"
          />
        ) : (
          <div className="w-12 h-9 rounded bg-sp-admin-bg border border-sp-admin-border flex items-center justify-center text-sp-admin-muted text-[10px]">
            --
          </div>
        )}
      </td>

      {/* Title */}
      <td className="px-4 py-3 font-medium text-sp-admin-text max-w-[180px]">
        <span className="line-clamp-2 text-xs">{g.title}</span>
      </td>

      {/* Creator */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted">
          {g.talent.name}
        </span>
      </td>

      {/* Brand */}
      <td className="px-4 py-3 text-xs text-sp-admin-muted">{g.brandName}</td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
            active
              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40'
              : 'bg-sp-admin-bg text-sp-admin-muted border border-sp-admin-border'
          }`}
        >
          {active ? 'Activo' : 'Finalizado'}
        </span>
      </td>

      {/* End date */}
      <td className="px-4 py-3 text-xs text-sp-admin-muted whitespace-nowrap">
        {g.endsAt
          ? new Date(g.endsAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </td>

      {/* Featured toggle */}
      <td className="px-4 py-3 text-center">
        <form action={setGiveawayFeaturedAction.bind(null, g.id, !g.isFeatured)}>
          <button type="submit" title={g.isFeatured ? 'Quitar destacado' : 'Marcar como destacado'}>
            <div
              className={`w-8 h-4 rounded-full relative transition-colors mx-auto ${
                g.isFeatured ? 'bg-sp-orange' : 'bg-sp-admin-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                  g.isFeatured ? 'left-4' : 'left-0.5'
                }`}
              />
            </div>
          </button>
        </form>
      </td>

      {/* Badge */}
      <td className="px-4 py-3">
        {g.badge ? (
          <form
            action={setGiveawayBadgeAction.bind(null, g.id, null)}
            className="flex items-center gap-1.5"
          >
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-sp-orange/15 text-sp-orange border border-sp-orange/30">
              {g.badge}
            </span>
            <button
              type="submit"
              className="text-[10px] text-sp-admin-muted hover:text-red-400 transition-colors"
              title="Quitar badge"
            >
              ✕
            </button>
          </form>
        ) : (
          <form
            action={setGiveawayBadgeFromFormAction}
            className="flex items-center gap-1"
          >
            <input type="hidden" name="giveawayId" value={g.id} />
            <select
              name="badge"
              defaultValue=""
              className="h-7 rounded-md border border-sp-admin-border bg-sp-admin-card px-2 text-[11px] text-sp-admin-muted outline-none"
            >
              <option value="" disabled>+ badge</option>
              {BADGE_OPTIONS.map((b: BadgeOption) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <button
              type="submit"
              className="text-[10px] font-bold text-sp-admin-accent hover:underline"
            >
              ✓
            </button>
          </form>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <EditGiveawayModal giveaway={g} brandCatalog={brands} />
          <DeleteConfirmButton
            action={deleteGiveawayAction}
            fields={{ id: g.id, talentSlug: g.talent.slug }}
            label={g.title.slice(0, 30)}
          />
        </div>
      </td>
    </tr>
  );
}
