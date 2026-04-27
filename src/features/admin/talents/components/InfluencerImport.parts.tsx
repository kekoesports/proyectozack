'use client';

// ── Constants ─────────────────────────────────────────────────────────

export const TALENT_FIELDS: readonly { value: string; label: string }[] = [
  { value: '(ignorar)', label: '--- Ignorar columna ---' },
  { value: 'name', label: 'Nombre' },
  { value: 'slug', label: 'Slug / Handle unico' },
  { value: 'platform', label: 'Plataforma principal (twitch|youtube)' },
  { value: 'youtubeHandle', label: 'Handle YouTube' },
  { value: 'twitchHandle', label: 'Handle Twitch' },
  { value: 'instagramHandle', label: 'Handle Instagram' },
  { value: 'tiktokHandle', label: 'Handle TikTok' },
  { value: 'kickHandle', label: 'Handle Kick' },
  { value: 'followers', label: 'Followers totales' },
  { value: 'country', label: 'Pais del creador (2 letras)' },
  { value: 'language', label: 'Idioma' },
  { value: 'vertical', label: 'Sector / Vertical' },
  { value: 'email', label: 'Email de contacto' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'notes', label: 'Notas internas' },
];

export const PREVIEW_ROWS = 5;

// ── Types ─────────────────────────────────────────────────────────────

export type Step = 'upload' | 'mapping' | 'matching' | 'confirm' | 'done';

export const STEPS: readonly { key: Step; label: string }[] = [
  { key: 'upload', label: '1. Subir' },
  { key: 'mapping', label: '2. Mapear' },
  { key: 'matching', label: '3. Cruzar' },
  { key: 'confirm', label: '4. Confirmar' },
  { key: 'done', label: 'Listo' },
];

// ── Helpers ───────────────────────────────────────────────────────────

export function guessMapping(headers: readonly string[]): Record<string, string> {
  const guess: Record<string, string> = {};
  const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const fieldAliases: Record<string, string[]> = {
    name: ['name', 'nombre', 'creator', 'influencer', 'talent'],
    slug: ['slug', 'handle', 'username', 'user', 'nick', 'nickname'],
    platform: ['platform', 'plataforma', 'primaryplatform', 'primary_platform'],
    youtubeHandle: ['youtubehandle', 'youtube', 'ythandle', 'yt'],
    twitchHandle: ['twitchhandle', 'twitch', 'twitchuser'],
    instagramHandle: ['instagramhandle', 'instagram', 'ig'],
    tiktokHandle: ['tiktokhandle', 'tiktok', 'tt'],
    kickHandle: ['kickhandle', 'kick'],
    followers: ['followers', 'seguidores', 'subs', 'subscribers'],
    country: ['country', 'pais', 'país', 'geo', 'location'],
    language: ['language', 'idioma', 'lang'],
    email: ['email', 'correo', 'mail', 'contactemail', 'contact_email'],
    telegram: ['telegram', 'tg'],
    notes: ['notes', 'notas', 'internalnotes', 'internal_notes'],
  };

  for (const header of headers) {
    const norm = normalize(header);
    let matched = '(ignorar)';
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      if (aliases.includes(norm)) {
        matched = field;
        break;
      }
    }
    guess[header] = matched;
  }

  return guess;
}

export function matchTypeLabel(type: 'slug' | 'name' | 'handle'): string {
  switch (type) {
    case 'slug': return 'por slug';
    case 'name': return 'por nombre';
    case 'handle': return 'por handle';
  }
}

// ── Sub-components ────────────────────────────────────────────────────

type StepIndicatorProps = {
  readonly current: Step;
};

export function StepIndicator({ current }: StepIndicatorProps): React.ReactElement {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isDone = i < currentIdx;
        return (
          <div key={s.key} className="flex items-center">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-sp-admin-accent text-sp-admin-bg'
                  : isDone
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-sp-admin-bg text-sp-admin-muted border border-sp-admin-border'
              }`}
            >
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-4 ${isDone ? 'bg-emerald-500/40' : 'bg-sp-admin-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SummaryCard({
  label,
  count,
  sublabel,
  color,
}: {
  readonly label: string;
  readonly count: number;
  readonly sublabel: string;
  readonly color: 'blue' | 'emerald' | 'amber' | 'red';
}): React.ReactElement {
  const colorMap = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    red: 'border-red-500/30 bg-red-500/5',
  };
  const textMap = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <p className={`text-2xl font-black tabular-nums ${textMap[color]}`}>{count}</p>
      <p className="text-xs font-semibold text-sp-admin-text mt-0.5">{label}</p>
      <p className="text-[10px] text-sp-admin-muted">{sublabel}</p>
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
        active
          ? 'bg-sp-admin-accent text-sp-admin-bg'
          : 'text-sp-admin-muted hover:bg-sp-admin-hover'
      }`}
    >
      {label}
    </button>
  );
}

export function EmptyState({ text }: { readonly text: string }): React.ReactElement {
  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-8 text-center">
      <p className="text-xs text-sp-admin-muted">{text}</p>
    </div>
  );
}

export function StatusBadge({ status }: { readonly status: string }): React.ReactElement {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    available: 'bg-blue-500/10 text-blue-400',
    inactive: 'bg-sp-admin-bg text-sp-admin-muted',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${styles[status] ?? styles['inactive']}`}>
      {status}
    </span>
  );
}
