import type { Tone } from './StateBadge';

type AlertItem = {
  readonly id: string;
  readonly message: string;
  readonly tone: Tone;
  readonly href?: string;
};

type Props = {
  readonly items: readonly AlertItem[];
  readonly emptyMessage?: string;
};

const TONE_COLOR: Record<Tone, string> = {
  success: 'var(--color-sp-success)',
  warning: 'var(--color-sp-warning)',
  danger: 'var(--color-sp-danger)',
  neutral: 'var(--color-sp-neutral)',
  info: 'var(--color-sp-info)',
};

const TONE_BG: Record<Tone, string> = {
  success: 'var(--color-sp-success-bg)',
  warning: 'var(--color-sp-warning-bg)',
  danger: 'var(--color-sp-danger-bg)',
  neutral: 'var(--color-sp-neutral-bg)',
  info: 'var(--color-sp-info-bg)',
};

function AlertIcon({ tone }: { readonly tone: Tone }): React.ReactElement {
  const color = TONE_COLOR[tone];

  if (tone === 'success') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  if (tone === 'danger') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }

  if (tone === 'warning') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  if (tone === 'info') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  }

  // neutral
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function AlertRow({ item }: { readonly item: AlertItem }): React.ReactElement {
  const color = TONE_COLOR[item.tone];
  const bg = TONE_BG[item.tone];

  const inner = (
    <div
      className="flex items-start gap-2.5 rounded-md px-3 py-2.5 text-xs"
      style={{ backgroundColor: bg }}
    >
      <span className="mt-0.5 flex-shrink-0">
        <AlertIcon tone={item.tone} />
      </span>
      <span style={{ color }}>{item.message}</span>
    </div>
  );

  if (item.href !== undefined) {
    return (
      <li>
        <a
          href={item.href}
          className="block rounded-md transition-opacity hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-sp-admin-accent"
        >
          {inner}
        </a>
      </li>
    );
  }

  return <li>{inner}</li>;
}

/**
 * Lista de alertas operativas con tono coloreado (success/warning/danger/neutral/info) y enlace opcional.
 *
 * @kind server
 * @feature admin/_shared
 * @example
 * ```tsx
 * <AlertList items={[{ id: '1', message: '3 facturas vencidas', tone: 'danger', href: '/admin/invoices' }]} />
 * ```
 */
export function AlertList({ items, emptyMessage = 'Sin alertas' }: Props): React.ReactElement {
  if (items.length === 0) {
    return (
      <p className="text-xs text-sp-admin-muted py-4 text-center">{emptyMessage}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <AlertRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
