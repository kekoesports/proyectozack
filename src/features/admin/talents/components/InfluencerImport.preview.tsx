'use client';

import type {
  MatchedRow,
  UnmatchedDocRow,
} from '@/app/admin/(dashboard)/talents/import/actions';
import { matchTypeLabel, StatusBadge } from './InfluencerImport.parts';

const DIFF_LABELS_MAP: Record<string, string> = {
  name: 'Nombre',
  slug: 'Slug',
  platform: 'Plataforma',
  country: 'Pais',
  language: 'Idioma',
  followers: 'Followers',
  email: 'Email',
  telegram: 'Telegram',
  twitchHandle: 'Twitch',
  youtubeHandle: 'YouTube',
  instagramHandle: 'Instagram',
  tiktokHandle: 'TikTok',
  kickHandle: 'Kick',
  notes: 'Notas',
};

export function MatchedRowCard({
  row,
  selected,
  onToggle,
}: {
  readonly row: MatchedRow;
  readonly selected: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? 'bg-blue-500/5 border-blue-500/30'
          : 'bg-sp-admin-card border-sp-admin-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 accent-blue-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-sp-admin-text">{row.existing.name}</span>
            <span className="text-[10px] font-mono text-sp-admin-muted">@{row.existing.slug}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
              {matchTypeLabel(row.matchType)}
            </span>
            <StatusBadge status={row.existing.status} />
          </div>

          {/* Diffs table */}
          {row.diffs.length > 0 && (
            <div className="mt-3 rounded-lg bg-sp-admin-bg border border-sp-admin-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-sp-admin-border">
                    <th className="text-left px-3 py-1.5 font-semibold text-sp-admin-muted w-28">Campo</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-sp-admin-muted">En BD</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-sp-admin-muted">En documento</th>
                  </tr>
                </thead>
                <tbody>
                  {row.diffs.map((d) => (
                    <tr key={d.field} className="border-b border-sp-admin-border/50 last:border-0">
                      <td className="px-3 py-1.5 text-sp-admin-muted font-medium">{d.label}</td>
                      <td className="px-3 py-1.5 text-red-400">
                        {d.dbValue || <span className="italic text-sp-admin-muted">(vacio)</span>}
                      </td>
                      <td className="px-3 py-1.5 text-emerald-400 font-medium">{d.docValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Current socials info */}
          {row.existing.socials.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {row.existing.socials.map((s, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted"
                >
                  {s.platform}: @{s.handle} ({s.followersDisplay})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewRowCard({
  row,
  selected,
  onToggle,
}: {
  readonly row: UnmatchedDocRow;
  readonly selected: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  const name = row.mapped['name'] ?? '';
  const slug = row.mapped['slug'] ?? '';

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-sp-admin-card border-sp-admin-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 accent-emerald-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-sp-admin-text">{name || '(sin nombre)'}</span>
            {slug && <span className="text-[10px] font-mono text-sp-admin-muted">@{slug}</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
              nuevo
            </span>
          </div>

          {/* Show all mapped fields */}
          <div className="mt-2 flex gap-2 flex-wrap">
            {Object.entries(row.mapped)
              .filter(([, v]) => v.trim())
              .map(([field, value]) => (
                <span
                  key={field}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted"
                >
                  {DIFF_LABELS_MAP[field] ?? field}: {value}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
