'use client';

import { useMemo, useState } from 'react';
import type { StatsRow } from '@/lib/queries/stats';

type Props = {
  readonly rows: readonly StatsRow[];
};

const BTN_PRIMARY = 'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
const BTN_GHOST = 'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';

const FIELD_OPTIONS = [
  { key: 'handle', label: 'Handle' },
  { key: 'profileUrl', label: 'URL perfil' },
  { key: 'followersDisplay', label: 'Followers (texto)' },
  { key: 'followersNumeric', label: 'Followers (número)' },
  { key: 'avgViewers', label: 'CCV / Avg viewers' },
] as const;

type FieldKey = (typeof FIELD_OPTIONS)[number]['key'];

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseFollowersText(t: string): number {
  if (!t || t === '-') return 0;
  const n = t.replace(/[,\s]/g, '').toUpperCase();
  const m = n.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!m) {
    const direct = Number(n);
    return Number.isFinite(direct) ? direct : 0;
  }
  const base = Number(m[1]);
  const suffix = m[2];
  const mult = suffix === 'K' ? 1_000 : suffix === 'M' ? 1_000_000 : suffix === 'B' ? 1_000_000_000 : 1;
  return Math.round(base * mult);
}

/**
 * Panel para exportar snapshots de stats filtrando por talents y plataformas seleccionadas.
 *
 * @kind client
 * @feature admin/stats
 * @route /admin/talents/[id]/stats
 */
export function StatsExportPanel({ rows }: Props): React.ReactElement {
  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const s of r.socials) set.add(s.platform);
    return [...set].sort();
  }, [rows]);

  const [selectedTalents, setSelectedTalents] = useState<Set<number>>(() => new Set(rows.map((r) => r.id)));
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(() => new Set(allPlatforms));
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(() => new Set<FieldKey>(['handle', 'profileUrl', 'followersDisplay', 'followersNumeric']));
  const [search, setSearch] = useState('');
  const [shape, setShape] = useState<'long' | 'wide'>('long');

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const toggleTalent = (id: number): void => {
    setSelectedTalents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePlatform = (p: string): void => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const toggleField = (f: FieldKey): void => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const selectAllVisible = (): void => {
    setSelectedTalents(new Set(filteredRows.map((r) => r.id)));
  };
  const deselectAll = (): void => setSelectedTalents(new Set());
  const allPlatformsOn = (): void => setSelectedPlatforms(new Set(allPlatforms));
  const noPlatforms = (): void => setSelectedPlatforms(new Set());

  const exportCsv = (): void => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const platformsArr = [...selectedPlatforms];

    if (shape === 'long') {
      const header = ['Talent', 'Plataforma', ...FIELD_OPTIONS.filter((f) => selectedFields.has(f.key)).map((f) => f.label)];
      const lines = [header.map(escapeCsv).join(',')];

      for (const row of rows) {
        if (!selectedTalents.has(row.id)) continue;
        for (const social of row.socials) {
          if (!selectedPlatforms.has(social.platform)) continue;
          const cols: (string | number)[] = [row.name, social.platform];
          if (selectedFields.has('handle')) cols.push(social.handle);
          if (selectedFields.has('profileUrl')) cols.push(social.profileUrl ?? '');
          if (selectedFields.has('followersDisplay')) cols.push(social.followersDisplay);
          if (selectedFields.has('followersNumeric')) cols.push(parseFollowersText(social.followersDisplay));
          if (selectedFields.has('avgViewers')) cols.push(social.avgViewers ?? '');
          lines.push(cols.map(escapeCsv).join(','));
        }
      }
      downloadCsv(`socialpro-stats-${dateStr}.csv`, lines.join('\n'));
      return;
    }

    // wide: one row per talent, columns per platform × field
    const header: string[] = ['Talent'];
    for (const p of platformsArr) {
      for (const f of FIELD_OPTIONS) {
        if (selectedFields.has(f.key)) header.push(`${p} - ${f.label}`);
      }
    }
    const lines = [header.map(escapeCsv).join(',')];

    for (const row of rows) {
      if (!selectedTalents.has(row.id)) continue;
      const cols: (string | number)[] = [row.name];
      for (const p of platformsArr) {
        const social = row.socials.find((s) => s.platform === p);
        for (const f of FIELD_OPTIONS) {
          if (!selectedFields.has(f.key)) continue;
          if (!social) { cols.push(''); continue; }
          if (f.key === 'handle') cols.push(social.handle);
          else if (f.key === 'profileUrl') cols.push(social.profileUrl ?? '');
          else if (f.key === 'followersDisplay') cols.push(social.followersDisplay);
          else if (f.key === 'followersNumeric') cols.push(parseFollowersText(social.followersDisplay));
          else if (f.key === 'avgViewers') cols.push(social.avgViewers ?? '');
        }
      }
      lines.push(cols.map(escapeCsv).join(','));
    }
    downloadCsv(`socialpro-stats-${dateStr}.csv`, lines.join('\n'));
  };

  const selectedCount = selectedTalents.size;
  const platformCount = selectedPlatforms.size;
  const canExport = selectedCount > 0 && platformCount > 0 && selectedFields.size > 0;

  return (
    <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-sp-admin-text text-sm">Exportar estadísticas</h2>
          <p className="text-xs text-sp-admin-muted mt-1">Selecciona creadores y redes para descargar un CSV listo para Excel.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!canExport} className={BTN_PRIMARY}>
          Descargar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Talents */}
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-bg p-3 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
              Creadores ({selectedCount}/{rows.length})
            </h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={selectAllVisible} className={BTN_GHOST}>Todos</button>
              <button type="button" onClick={deselectAll} className={BTN_GHOST}>Ninguno</button>
            </div>
          </div>
          <input
            type="search"
            placeholder="Buscar creador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-sp-admin-card px-3 py-1.5 text-xs text-sp-admin-text placeholder:text-sp-admin-muted/50 focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40 mb-3"
          />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredRows.map((r) => {
              const checked = selectedTalents.has(r.id);
              return (
                <label key={r.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sp-admin-hover cursor-pointer text-xs">
                  <input type="checkbox" checked={checked} onChange={() => toggleTalent(r.id)} />
                  <span className="text-sp-admin-text font-medium flex-1">{r.name}</span>
                  <span className="text-[10px] text-sp-admin-muted tabular-nums">{r.totalFormatted}</span>
                </label>
              );
            })}
            {filteredRows.length === 0 && (
              <p className="text-xs text-sp-admin-muted italic px-2 py-2">Sin resultados.</p>
            )}
          </div>
        </div>

        {/* Platforms */}
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-bg p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
              Plataformas ({platformCount}/{allPlatforms.length})
            </h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={allPlatformsOn} className={BTN_GHOST}>Todas</button>
              <button type="button" onClick={noPlatforms} className={BTN_GHOST}>Ninguna</button>
            </div>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {allPlatforms.map((p) => {
              const checked = selectedPlatforms.has(p);
              return (
                <label key={p} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sp-admin-hover cursor-pointer text-xs">
                  <input type="checkbox" checked={checked} onChange={() => togglePlatform(p)} />
                  <span className="text-sp-admin-text font-medium capitalize">{p}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Fields + format */}
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-bg p-3 space-y-4">
          <div>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-2">Campos</h3>
            <div className="space-y-1">
              {FIELD_OPTIONS.map((f) => {
                const checked = selectedFields.has(f.key);
                return (
                  <label key={f.key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sp-admin-hover cursor-pointer text-xs">
                    <input type="checkbox" checked={checked} onChange={() => toggleField(f.key)} />
                    <span className="text-sp-admin-text">{f.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-2">Formato</h3>
            <div className="flex gap-2">
              <label className={`flex-1 px-3 py-2 rounded-lg border cursor-pointer text-xs font-semibold text-center transition-colors ${shape === 'long' ? 'bg-sp-admin-accent text-sp-admin-bg border-sp-admin-accent' : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'}`}>
                <input type="radio" name="shape" checked={shape === 'long'} onChange={() => setShape('long')} className="sr-only" />
                Largo (1 fila por red)
              </label>
              <label className={`flex-1 px-3 py-2 rounded-lg border cursor-pointer text-xs font-semibold text-center transition-colors ${shape === 'wide' ? 'bg-sp-admin-accent text-sp-admin-bg border-sp-admin-accent' : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text'}`}>
                <input type="radio" name="shape" checked={shape === 'wide'} onChange={() => setShape('wide')} className="sr-only" />
                Ancho (1 fila por talent)
              </label>
            </div>
          </div>
        </div>
      </div>

      {!canExport && (
        <p className="text-xs text-sp-admin-muted italic">
          Selecciona al menos un creador, una plataforma y un campo para exportar.
        </p>
      )}
    </section>
  );
}
