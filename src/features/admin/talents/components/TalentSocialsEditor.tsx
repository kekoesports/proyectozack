'use client';

import { useState, useTransition } from 'react';
import { upsertTalentSocialsAction, type SocialEntryInput } from '@/app/admin/(dashboard)/talents/actions';

// ── Tipos y constantes ────────────────────────────────────────────────────────

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
  { value: 'twitch',    label: 'Twitch',    color: '#9147ff' },
  { value: 'youtube',   label: 'YouTube',   color: '#ff0000' },
  { value: 'kick',      label: 'Kick',      color: '#53fc18' },
  { value: 'instagram', label: 'Instagram', color: '#e1306c' },
  { value: 'tiktok',    label: 'TikTok',    color: '#010101' },
  { value: 'x',         label: 'X / Twitter', color: '#1da1f2' },
  { value: 'discord',   label: 'Discord',   color: '#5865F2' },
];

const inputCls = 'w-full rounded-md border border-sp-admin-border bg-sp-admin-bg px-2.5 py-1.5 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';

function toRow(s: ExistingSocial): Row {
  return { id: s.id, platform: s.platform, handle: s.handle, profileUrl: s.profileUrl ?? '', followersDisplay: s.followersDisplay };
}

// ── Componente ────────────────────────────────────────────────────────────────

type Props = {
  readonly talentId: number;
  readonly socials:  readonly ExistingSocial[];
};

/**
 * Editor inline de redes sociales de un talento.
 * Permite añadir, editar y eliminar plataformas.
 *
 * @kind client
 * @feature admin/talents
 */
export function TalentSocialsEditor({ talentId, socials }: Props): React.ReactElement {
  const [rows, setRows]         = useState<Row[]>(socials.length > 0 ? socials.map(toRow) : [{ platform: 'twitch', handle: '', profileUrl: '', followersDisplay: '-' }]);
  const [isPending, startTr]    = useTransition();
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

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

      {/* Filas de redes */}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[140px_1fr_1fr_80px_28px] gap-2 items-start">
          {/* Plataforma */}
          <select
            value={row.platform}
            onChange={(e) => update(idx, 'platform', e.target.value)}
            className={inputCls}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {/* Handle */}
          <input
            value={row.handle}
            onChange={(e) => update(idx, 'handle', e.target.value)}
            placeholder="@handle o nombre"
            className={inputCls}
          />

          {/* URL de perfil */}
          <input
            value={row.profileUrl}
            onChange={(e) => update(idx, 'profileUrl', e.target.value)}
            placeholder="https://twitch.tv/..."
            type="url"
            className={inputCls}
          />

          {/* Seguidores */}
          <input
            value={row.followersDisplay}
            onChange={(e) => update(idx, 'followersDisplay', e.target.value)}
            placeholder="17.4K"
            className={inputCls}
            maxLength={20}
          />

          {/* Quitar */}
          <button
            type="button"
            onClick={() => removeRow(idx)}
            disabled={rows.length <= 1}
            className="h-8 w-7 flex items-center justify-center rounded text-sp-admin-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 text-sm"
            title="Eliminar red"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Cabeceras de columna (solo visual, arriba del primer row) */}
      {rows.length > 0 && (
        <div className="grid grid-cols-[140px_1fr_1fr_80px_28px] gap-2 -mt-2 order-first">
          {['Plataforma', 'Handle / Nombre', 'URL del perfil', 'Seguidores', ''].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted px-0.5">{h}</p>
          ))}
        </div>
      )}

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
          className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Guardando…' : 'Guardar redes'}
        </button>
      </div>

    </div>
  );
}
