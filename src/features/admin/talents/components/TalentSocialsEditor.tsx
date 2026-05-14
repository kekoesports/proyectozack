'use client';

import { useState, useTransition } from 'react';
import { upsertTalentSocialsAction, type SocialEntryInput } from '@/app/admin/(dashboard)/talents/actions';

type ExistingSocial = {
  readonly id:               number;
  readonly platform:         string;
  readonly handle:           string;
  readonly profileUrl:       string | null;
  readonly followersDisplay: string;
  readonly sortOrder:        number;
};

type Row = {
  id?:               number;
  platform:          string;
  handle:            string;
  profileUrl:        string;
  followersDisplay:  string;
};

const PLATFORMS = [
  { value: 'twitch',    label: 'Twitch' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'kick',      label: 'Kick' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'x',         label: 'X / Twitter' },
  { value: 'discord',   label: 'Discord' },
];

const inputCls = 'w-full rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1';

function toRow(s: ExistingSocial): Row {
  return { id: s.id, platform: s.platform, handle: s.handle, profileUrl: s.profileUrl ?? '', followersDisplay: s.followersDisplay };
}

type Props = {
  readonly talentId: number;
  readonly socials:  readonly ExistingSocial[];
};

export function TalentSocialsEditor({ talentId, socials }: Props): React.ReactElement {
  const [rows, setRows]       = useState<Row[]>(socials.length > 0 ? socials.map(toRow) : [{ platform: 'twitch', handle: '', profileUrl: '', followersDisplay: '-' }]);
  const [isPending, startTr]  = useTransition();
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  function update(idx: number, field: keyof Row, value: string): void {
    setSaved(false);
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRow(): void {
    setSaved(false);
    setRows((prev) => [...prev, { platform: 'twitch', handle: '', profileUrl: '', followersDisplay: '-' }]);
  }

  function removeRow(idx: number): void {
    setSaved(false);
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave(): void {
    setError('');
    setSaved(false);
    const entries: SocialEntryInput[] = rows.map((r, i) => {
      const base = {
        platform:         r.platform,
        handle:           r.handle.trim(),
        followersDisplay: r.followersDisplay.trim() || '-',
        sortOrder:        i + 1,
        ...(r.profileUrl.trim() ? { profileUrl: r.profileUrl.trim() } : {}),
      };
      return r.id ? { ...base, id: r.id } : base;
    });
    startTr(async () => {
      const res = await upsertTalentSocialsAction(talentId, entries);
      if (res.ok) { setSaved(true); }
      else        { setError(res.error); }
    });
  }

  return (
    <div className="space-y-3">

      {/* Una tarjeta por red social */}
      {rows.map((row, idx) => (
        <div key={idx} className="rounded-lg border border-sp-admin-border bg-sp-admin-bg/50 p-3 space-y-2.5">
          {/* Fila 1: Plataforma + Seguidores + quitar */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={labelCls}>Plataforma</label>
              <select
                value={row.platform}
                onChange={(e) => update(idx, 'platform', e.target.value)}
                className={inputCls}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className={labelCls}>Seguidores</label>
              <input
                value={row.followersDisplay}
                onChange={(e) => update(idx, 'followersDisplay', e.target.value)}
                placeholder="17.4K"
                className={inputCls}
                maxLength={20}
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              disabled={rows.length <= 1}
              className="mb-0.5 h-9 w-9 flex items-center justify-center rounded-lg border border-sp-admin-border text-sp-admin-muted hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-30 text-sm shrink-0"
              title="Eliminar red"
            >
              ✕
            </button>
          </div>

          {/* Fila 2: Handle */}
          <div>
            <label className={labelCls}>Handle / Nombre de usuario</label>
            <input
              value={row.handle}
              onChange={(e) => update(idx, 'handle', e.target.value)}
              placeholder="@todocs2 o nombre del canal"
              className={inputCls}
            />
          </div>

          {/* Fila 3: URL */}
          <div>
            <label className={labelCls}>URL del perfil</label>
            <input
              value={row.profileUrl}
              onChange={(e) => update(idx, 'profileUrl', e.target.value)}
              placeholder="https://twitch.tv/todocs2"
              type="url"
              className={inputCls}
            />
          </div>
        </div>
      ))}

      {/* Acciones */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={addRow}
          className="text-[12px] font-semibold text-sp-admin-accent hover:underline"
        >
          + Añadir red
        </button>
        <div className="flex-1" />
        {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        {saved && <p className="text-[12px] text-emerald-600 font-semibold">✓ Guardado</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Guardando…' : 'Guardar redes'}
        </button>
      </div>

    </div>
  );
}
