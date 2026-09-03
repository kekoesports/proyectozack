'use client';

import { useState, useTransition } from 'react';
import { upsertTalentSocialsAction, type SocialEntryInput } from '@/app/admin/(dashboard)/talents/actions';
import { TalentProfileSocialPlatformSchema } from '@/lib/schemas/talentSocials';

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

const URL_PLACEHOLDER: Record<string, string> = {
  youtube: 'https://youtube.com/@canal',
  twitch: 'https://twitch.tv/creador',
  kick: 'https://kick.com/creador',
  instagram: 'https://instagram.com/creador',
  tiktok: 'https://tiktok.com/@creador',
  x: 'https://x.com/creador',
  discord: 'https://discord.gg/invitacion',
};

function handleFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const value = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parts = new URL(value).pathname.split('/').filter(Boolean);
    return (parts[parts.length - 1] ?? '').replace(/^@/, '');
  } catch {
    return trimmed;
  }
}

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
    const entries: SocialEntryInput[] = [];
    for (const [i, r] of rows.entries()) {
      const platform = TalentProfileSocialPlatformSchema.safeParse(r.platform);
      if (!platform.success) {
        setError(`Red ${i + 1}: plataforma no válida.`);
        return;
      }
      const profileUrl = r.profileUrl.trim();
      const base = {
        platform:         platform.data,
        handle:           profileUrl ? handleFromUrl(profileUrl) : r.handle.trim(),
        followersDisplay: r.followersDisplay.trim() || '-',
        sortOrder:        i + 1,
        ...(profileUrl ? { profileUrl } : {}),
      };
      entries.push(r.id ? { ...base, id: r.id } : base);
    }
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

          {/* Fila 2: URL */}
          <div>
            <label className={labelCls}>
              {row.platform === 'discord' ? 'Enlace de invitación' : 'URL del perfil'}
            </label>
            <input
              value={row.profileUrl}
              onChange={(e) => update(idx, 'profileUrl', e.target.value)}
              placeholder={URL_PLACEHOLDER[row.platform] ?? 'https://…'}
              type="url"
              inputMode="url"
              autoComplete="url"
              className={inputCls}
            />
            {(row.platform === 'discord' || row.platform === 'youtube') && (
              <p className="mt-1 text-[10px] leading-4 text-sp-admin-muted">
                {row.platform === 'discord'
                  ? 'Pega una invitación discord.gg o discord.com/invite.'
                  : 'Acepta enlaces @canal, /channel/… y /c/… de YouTube.'}
              </p>
            )}
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
        {error && <p aria-live="polite" className="text-[12px] text-red-500 font-medium">{error}</p>}
        {saved && <p aria-live="polite" className="text-[12px] text-emerald-600 font-semibold">✓ Guardado</p>}
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
