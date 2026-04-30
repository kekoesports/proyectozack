// Constantes y helpers de campañas — sin 'use client', importable desde servidor y cliente

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  negociacion: { label: 'Negociación', color: '#8b3aad', bg: '#8b3aad14' },
  activa:      { label: 'Activa',      color: '#16a34a', bg: '#16a34a14' },
  pausada:     { label: 'Pausada',     color: '#f59e0b', bg: '#f59e0b14' },
  finalizada:  { label: 'Finalizada',  color: '#5b9bd5', bg: '#5b9bd514' },
  cancelada:   { label: 'Cancelada',   color: '#ef4444', bg: '#ef444414' },
};

export const PAYMENT_METHODS = [
  'Crypto agencia', 'Crypto Zack', 'Banco SocialPro', 'Banco Stark', 'Otro',
];

export const SECTORS = [
  'CS2 Cases', 'Marketplace CS2', 'Casino', 'Casas de apuestas',
  'Periféricos', 'Gaming', 'Esports', 'Crypto', 'Otros',
];

export const GEOS = [
  'LATAM', 'Spain', 'Europa', 'Turquía', 'India', 'Japón', 'Global', 'Otro',
];

export function formatMoney(n: string | number | null | undefined): string {
  if (!n) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n));
}

export function StatusBadge({ status }: { readonly status: string }): React.ReactElement {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#72728a', bg: '#72728a14' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

export function PaidBadge({ paid }: { readonly paid: 'si' | 'no' | 'parcial' | boolean }): React.ReactElement {
  const isPaid = paid === true || paid === 'si';
  const isPartial = paid === 'parcial';
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        ✓ Cobrado
      </span>
    );
  }
  if (isPartial) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        ~ Parcial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      ○ Pendiente
    </span>
  );
}
