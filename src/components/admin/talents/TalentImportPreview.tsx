'use client';

import type { TalentImportPreview as Preview, TalentImportResult, ParsedTalentRow } from '@/app/admin/(dashboard)/talents/import-actions';

type Props = {
  readonly preview: Preview;
  readonly result: TalentImportResult;
  readonly isPending: boolean;
  readonly formAction: (formData: FormData) => void;
  readonly onReset: () => void;
};

const ACTION_CFG = {
  create: { label: 'Crear',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  update: { label: 'Actualizar',cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  review: { label: 'Revisar',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
} as const;

const PLATFORM_ICONS: Record<string, string> = {
  twitch: '🟣', youtube: '🔴', instagram: '🟠', tiktok: '⬛', kick: '🟢', twitter: '🔵',
};

function PlatformChip({ platform, followers }: { platform: string; followers: string }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted">
      {PLATFORM_ICONS[platform] ?? '🌐'} {followers}
    </span>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }): React.ReactElement {
  return (
    <div className="rounded-lg bg-sp-admin-card border border-sp-admin-border overflow-hidden text-center">
      <div className="h-[2px]" style={{ background: color }} />
      <div className="px-3 py-2.5">
        <p className="text-[18px] font-bold tabular-nums" style={{ color }}>{value}</p>
        <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function TalentImportPreview({ preview, result, isPending, formAction, onReset }: Props): React.ReactElement {
  const { rows, mappedColumns, unmappedColumns, summary } = preview;
  const importable = rows.filter((r) => r.errors.length === 0 && (r.action === 'create' || r.action === 'update'));

  return (
    <div className="space-y-4">
      {/* Resultado de importación confirmada */}
      {result.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
          <p className="font-bold text-emerald-800 text-sm">
            ✓ Importación completada —&nbsp;
            {result.created ? `${result.created} creados` : ''}
            {result.created && result.updated ? ', ' : ''}
            {result.updated ? `${result.updated} actualizados` : ''}
          </p>
          {result.skipped ? <p className="text-[11px] text-sp-admin-muted mt-1">{result.skipped} omitidos</p> : null}
          {result.errors && result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-[11px] text-red-600 cursor-pointer font-semibold">Ver errores ({result.errors.length})</summary>
              <ul className="text-[10px] text-red-500 mt-1 space-y-0.5 font-mono">{result.errors.map((e, i) => <li key={i}>· {e}</li>)}</ul>
            </details>
          )}
          <p className="text-[10px] text-sp-admin-muted mt-2">Los talentos importados tienen estado <strong>inactivo</strong> + visibilidad <strong>interno</strong>.</p>
        </div>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-5 gap-2">
        <SummaryCard label="Total"      value={summary.total}  color="#6b7280" />
        <SummaryCard label="Crear"      value={summary.create} color="#16a34a" />
        <SummaryCard label="Actualizar" value={summary.update} color="#2563eb" />
        <SummaryCard label="Revisar"    value={summary.review} color="#d97706" />
        <SummaryCard label="Errores"    value={summary.errors} color="#dc2626" />
      </div>

      {/* Columnas detectadas / no mapeadas */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Columnas detectadas</p>
        <div className="flex flex-wrap gap-1.5">
          {mappedColumns.map((c) => (
            <span key={c.original} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700">
              ✓ {c.original} <span className="text-emerald-400/70">→ {c.field}</span>
            </span>
          ))}
          {unmappedColumns.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sp-admin-border bg-sp-admin-hover text-[10px] font-semibold text-sp-admin-muted/60">
              — {c}
            </span>
          ))}
        </div>
      </div>

      {/* Tabla preview */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
              <th className="text-left px-3 py-2 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">#</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Nombre</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">País</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Plataformas</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Contacto</th>
              <th className="text-left px-3 py-2 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <TalentPreviewRow key={r.rowNumber} row={r} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Botones confirmación */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors">
          ← Subir otro archivo
        </button>
        <form action={formAction}>
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <button type="submit" disabled={isPending || importable.length === 0}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
            {isPending ? 'Importando…' : `Confirmar — ${importable.length} talentos`}
          </button>
        </form>
      </div>

      <p className="text-[10px] text-sp-admin-muted text-right">
        {summary.review > 0 && `${summary.review} filas requieren revisión manual · `}
        Los talentos se crean como <strong>inactivos</strong> e <strong>internos</strong>.
      </p>
    </div>
  );
}

function TalentPreviewRow({ row }: { readonly row: ParsedTalentRow }): React.ReactElement {
  const hasErrors   = row.errors.length > 0;
  const hasWarnings = row.warnings.length > 0;
  const cfg = ACTION_CFG[row.action];

  const platforms: { p: string; f: string }[] = [];
  if (row.twitch)    platforms.push({ p: 'twitch',    f: row.twitch.followersDisplay });
  if (row.youtube)   platforms.push({ p: 'youtube',   f: row.youtube.followersDisplay });
  if (row.instagram) platforms.push({ p: 'instagram', f: row.instagram.followersDisplay });
  if (row.tiktok)    platforms.push({ p: 'tiktok',    f: row.tiktok.followersDisplay });
  if (row.kick)      platforms.push({ p: 'kick',      f: row.kick.followersDisplay });

  return (
    <tr className={`border-b border-sp-admin-border/40 last:border-0 text-[11px] ${hasErrors ? 'bg-red-50/40' : ''}`}>
      <td className="px-3 py-2 font-mono text-sp-admin-muted">{row.rowNumber}</td>
      <td className="px-3 py-2 max-w-[180px]">
        <p className="font-semibold text-sp-admin-text truncate">{row.name}</p>
        {row.existingName && (
          <p className="text-[9px] text-blue-500 truncate">→ {row.existingName}</p>
        )}
        {hasErrors && <p className="text-[9px] text-red-500 truncate">{row.errors[0]}</p>}
        {!hasErrors && hasWarnings && <p className="text-[9px] text-amber-500 truncate">{row.warnings[0]}</p>}
      </td>
      <td className="px-3 py-2 text-sp-admin-muted">{row.country ?? '—'}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {platforms.length > 0
            ? platforms.map((pl) => <PlatformChip key={pl.p} platform={pl.p} followers={pl.f} />)
            : <span className="text-sp-admin-muted/40 text-[10px]">—</span>
          }
        </div>
      </td>
      <td className="px-3 py-2 text-sp-admin-muted">
        {row.contactTelegram && <span className="block text-[10px]">✈ @{row.contactTelegram}</span>}
        {row.contactDiscord  && <span className="block text-[10px]">🎮 {row.contactDiscord}</span>}
        {row.contactEmail    && <span className="block text-[10px]">✉ {row.contactEmail}</span>}
        {!row.contactTelegram && !row.contactDiscord && !row.contactEmail && <span className="text-sp-admin-muted/40">—</span>}
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
          {cfg.label}
        </span>
      </td>
    </tr>
  );
}
