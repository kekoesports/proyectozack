/**
 * Badge que etiqueta el tipo y contexto de una recompensa.
 *
 * Debe usarse en cualquier card de recompensa o sorteo para que el
 * usuario distinga entre canje interno, sorteo gratuito y oferta de
 * partner externo. Requisito de `docs/rewards-policy.md` y del
 * informe de auditoría.
 *
 * @kind server
 * @feature rewards
 */

export type RewardBadgeKind =
  | 'fixed_reward'
  | 'free_raffle'
  | 'external_partner_giveaway'
  | 'cosmetic_badge'
  | 'stock_limited';

interface Props {
  readonly kind: RewardBadgeKind;
  /** Texto sobreescrito. Si se omite, se usa el label por defecto. */
  readonly label?: string;
  readonly id?: string;
}

const LABELS: Readonly<Record<RewardBadgeKind, string>> = {
  fixed_reward:              'Recompensa fija',
  free_raffle:               'Sorteo gratuito',
  external_partner_giveaway: 'Partner externo',
  cosmetic_badge:            'Cosmético',
  stock_limited:             'Stock limitado',
};

const COLORS: Readonly<Record<RewardBadgeKind, { bg: string; fg: string; border: string }>> = {
  fixed_reward:              { bg: 'rgba(46,160,67,0.14)',  fg: '#7ee08a', border: 'rgba(46,160,67,0.32)' },
  free_raffle:               { bg: 'rgba(91,155,213,0.14)', fg: '#8fc3ee', border: 'rgba(91,155,213,0.32)' },
  external_partner_giveaway: { bg: 'rgba(245,158,11,0.14)', fg: '#f5c06a', border: 'rgba(245,158,11,0.32)' },
  cosmetic_badge:            { bg: 'rgba(139,58,173,0.14)', fg: '#c891e0', border: 'rgba(139,58,173,0.32)' },
  stock_limited:             { bg: 'rgba(224,48,112,0.14)', fg: '#e88ab3', border: 'rgba(224,48,112,0.32)' },
};

export function RewardTypeBadge({ kind, label, id }: Props): React.JSX.Element {
  const c = COLORS[kind];
  return (
    <span
      id={id}
      role="note"
      aria-label={label ?? LABELS[kind]}
      data-reward-kind={kind}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '6px',
        padding:        '3px 8px',
        borderRadius:   '999px',
        border:         `1px solid ${c.border}`,
        background:     c.bg,
        color:          c.fg,
        fontSize:       '10px',
        fontWeight:     700,
        letterSpacing:  '0.08em',
        textTransform:  'uppercase',
        lineHeight:     1.2,
      }}
    >
      {label ?? LABELS[kind]}
    </span>
  );
}
