'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { DashboardAlert, AlertSeverity, AlertSummary } from '@/lib/queries/alerts';
import { AlertResolveButton } from './AlertResolveButton';

const DISMISS_KEY  = 'sp-dismissed-alerts';
const SNOOZE_KEY   = 'sp-snoozed-alerts';
const COLLAPSE_KEY = 'sp-alerts-collapsed';

type SnoozedEntry = { id: string; until: number };

// ── Configuración visual ──────────────────────────────────────────────

const SEVERITY_CFG: Record<AlertSeverity, { bar: string; badge: string; label: string; dot: string }> = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500',    label: 'Crítica' },
  high:     { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'Alta'    },
  medium:   { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400',  label: 'Media'   },
  low:      { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-400',   label: 'Baja'    },
};

const TYPE_ICON: Record<string, string> = {
  overdue_task:                   '✓',
  overdue_followup:               '📅',
  unpaid_brand:                   '💰',
  pending_talent:                 '💸',
  expiring_deal:                  '⏳',
  expired_active:                 '⚠️',
  task_due_today_high:            '🔥',
  task_rolled_over:               '↻',
  invoice_overdue:                '📄',
  deal_brand_paid_talent_pending: '⚡',
  issued_invoice_overdue:         '🧾',
  issued_invoice_due_soon:        '⏰',
  task_assigned:                  '📋',
};

const TYPE_LABEL: Record<string, string> = {
  overdue_task:                   'tareas vencidas',
  overdue_followup:               'seguimientos vencidos',
  unpaid_brand:                   'cobros de marca pendientes',
  pending_talent:                 'pagos a talento pendientes',
  expiring_deal:                  'tratos por vencer',
  expired_active:                 'campañas caducadas',
  task_due_today_high:            'tareas urgentes',
  task_rolled_over:               'tareas arrastradas',
  invoice_overdue:                'facturas vencidas',
  deal_brand_paid_talent_pending: 'tratos con pago pendiente',
  issued_invoice_overdue:         'facturas emitidas vencidas',
  issued_invoice_due_soon:        'facturas próximas a vencer',
  task_assigned:                  'tareas asignadas',
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// ── useAlertSnooze — abstractable para futura migración a snoozed_until DB ─

function useAlertSnooze(): {
  isSnoozed: (id: string) => boolean;
  snooze: (id: string, hours: number) => void;
} {
  const [snoozedMap, setSnoozedMap] = useState<Map<string, number>>(() => {
    if (typeof window === 'undefined') return new Map();
    try {
      const entries = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '[]') as SnoozedEntry[];
      const now = Date.now();
      return new Map(entries.filter((e) => e.until > now).map((e) => [e.id, e.until]));
    } catch { return new Map(); }
  });

  const snooze = useCallback((id: string, hours: number): void => {
    const until = Date.now() + hours * 3_600_000;
    setSnoozedMap((prev) => {
      const next = new Map(prev);
      next.set(id, until);
      try {
        const payload: SnoozedEntry[] = [...next.entries()].map(([i, u]) => ({ id: i, until: u }));
        localStorage.setItem(SNOOZE_KEY, JSON.stringify(payload));
      } catch { /* noop */ }
      return next;
    });
  }, []);

  const isSnoozed = useCallback((id: string): boolean => {
    const until = snoozedMap.get(id);
    return until !== undefined && until > Date.now();
  }, [snoozedMap]);

  return { isSnoozed, snooze };
}

// ── SeverityBadge ─────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }): React.ReactElement {
  const cfg = SEVERITY_CFG[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${cfg.badge}`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── AlertItem ─────────────────────────────────────────────────────────

function AlertItem({
  alert,
  onDismiss,
  onSnooze,
}: {
  readonly alert:    DashboardAlert;
  readonly onDismiss: (id: string) => void;
  readonly onSnooze:  (id: string, hours: number) => void;
}): React.ReactElement {
  const [showSnooze, setShowSnooze] = useState(false);
  const cfg  = SEVERITY_CFG[alert.severity];
  const icon = TYPE_ICON[alert.type] ?? '•';

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-sp-admin-hover/40 transition-colors border-b border-sp-admin-border/40 last:border-0">
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${cfg.bar}`} />
      <span className="text-[14px] leading-none mt-0.5 shrink-0 select-none" aria-hidden>{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-semibold text-sp-admin-text leading-snug truncate max-w-[280px]">
            {alert.title}
          </p>
          <SeverityBadge severity={alert.severity} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-sp-admin-muted">{alert.description}</span>
          {alert.amount !== undefined && alert.amount > 0 && (
            <>
              <span className="text-sp-admin-muted/40 text-[10px]">·</span>
              <span className="text-[10px] font-bold tabular-nums text-sp-admin-text">{EUR.format(alert.amount)}</span>
            </>
          )}
          {alert.daysInfo && (
            <>
              <span className="text-sp-admin-muted/40 text-[10px]">·</span>
              <span className={`text-[10px] font-semibold ${
                alert.severity === 'critical' || alert.severity === 'high' ? 'text-red-500' : 'text-amber-600'
              }`}>
                {alert.daysInfo}
              </span>
            </>
          )}
        </div>

        {/* Opciones de Posponer */}
        {showSnooze && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-sp-admin-muted">Posponer:</span>
            {([8, 24, 72] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => { onSnooze(alert.id, h); setShowSnooze(false); }}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text hover:border-sp-admin-accent/40 transition-colors"
              >
                {h}h
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSnooze(false)}
              className="px-1 text-[9px] text-sp-admin-muted/60 hover:text-sp-admin-muted"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {alert.resolveHint && <AlertResolveButton hint={alert.resolveHint} />}
        <Link href={alert.href} className="text-[10px] font-bold text-sp-admin-accent hover:underline whitespace-nowrap">
          Ver →
        </Link>
        <button
          type="button"
          onClick={() => setShowSnooze((v) => !v)}
          className="text-sp-admin-muted/50 hover:text-sp-admin-muted transition-colors text-[11px]"
          title="Posponer alerta"
          aria-label="Posponer"
        >
          ⏱
        </button>
        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          className="text-sp-admin-muted/50 hover:text-sp-admin-muted transition-colors leading-none text-base"
          aria-label="Descartar alerta"
          title="Descartar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── Grupo colapsable de alertas del mismo tipo ────────────────────────

function AlertGroup({
  type,
  alerts,
  onDismiss,
  onSnooze,
}: {
  readonly type:     string;
  readonly alerts:   readonly DashboardAlert[];
  readonly onDismiss: (id: string) => void;
  readonly onSnooze:  (id: string, hours: number) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const icon          = TYPE_ICON[type] ?? '•';
  const label         = TYPE_LABEL[type] ?? type;
  const worstSeverity = alerts[0]?.severity ?? 'low';
  const cfg           = SEVERITY_CFG[worstSeverity];

  return (
    <div className="border-b border-sp-admin-border/40 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-sp-admin-hover/40 transition-colors text-left"
      >
        <div className={`w-0.5 self-stretch rounded-full shrink-0 ${cfg.bar}`} />
        <span className="text-[13px] shrink-0 select-none" aria-hidden>{icon}</span>
        <span className="flex-1 text-[12px] font-semibold text-sp-admin-text">
          <span className="tabular-nums">{alerts.length}</span>&nbsp;{label}
        </span>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
          {cfg.label}
        </span>
        <span className="text-[10px] text-sp-admin-muted ml-1 select-none" aria-hidden>
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && alerts.map((a) => (
        <AlertItem key={a.id} alert={a} onDismiss={onDismiss} onSnooze={onSnooze} />
      ))}
    </div>
  );
}

// ── Estado vacío ──────────────────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card border border-emerald-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-5 text-center">
      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
        <span className="text-emerald-600 text-[16px]" aria-hidden>✓</span>
      </div>
      <p className="text-[13px] font-bold text-sp-admin-text">Todo bajo control</p>
      <p className="text-[11px] text-sp-admin-muted mt-0.5 mb-3">No hay alertas críticas pendientes</p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {([
          { label: 'Revisar leads',       href: '/admin/brands'  },
          { label: 'Actualizar talentos', href: '/admin/talents' },
          { label: 'Crear follow-ups',    href: '/admin/brands'  },
        ] as const).map((s) => (
          <Link key={s.label} href={s.href} className="text-[11px] font-semibold text-sp-admin-accent hover:underline">
            {s.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

type Props = {
  readonly alerts:  readonly DashboardAlert[];
  readonly summary: AlertSummary;
};

// ── Componente principal ──────────────────────────────────────────────

export function DashboardAlerts({ alerts }: Props): React.ReactElement {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });

  const { isSnoozed, snooze } = useAlertSnooze();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });

  function dismiss(id: string): void {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  function toggleCollapse(): void {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }

  const visible = alerts.filter((a) => !dismissedIds.has(a.id) && !isSnoozed(a.id));

  if (visible.length === 0) return <EmptyState />;

  const critical = visible.filter((a) => a.severity === 'critical').length;
  const high     = visible.filter((a) => a.severity === 'high').length;

  // Agrupar por tipo manteniendo el orden del servidor
  const typeOrder: string[] = [];
  const groups = new Map<string, DashboardAlert[]>();
  for (const alert of visible) {
    const existing = groups.get(alert.type);
    if (existing) {
      existing.push(alert);
    } else {
      typeOrder.push(alert.type);
      groups.set(alert.type, [alert]);
    }
  }

  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden border border-sp-admin-border">

      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted shrink-0">
            Alertas críticas
          </p>
          {critical > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {critical} crítica{critical !== 1 ? 's' : ''}
            </span>
          )}
          {high > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
              <span className="w-1 h-1 rounded-full bg-orange-500" />
              {high} alta{high !== 1 ? 's' : ''}
            </span>
          )}
          {/* Resumen compacto de tipos (reemplaza el grid de tiles) */}
          <span className="hidden sm:flex items-center gap-1.5 flex-wrap">
            {typeOrder.slice(0, 4).map((type) => {
              const count = groups.get(type)?.length ?? 0;
              return (
                <span key={type} className="text-[9px] text-sp-admin-muted/70">
                  · {count}&nbsp;{TYPE_LABEL[type] ?? type}
                </span>
              );
            })}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[9px] text-sp-admin-muted/60">
            {visible.length} alerta{visible.length !== 1 ? 's' : ''}
            {dismissedIds.size > 0 && ` · ${dismissedIds.size} desc.`}
          </span>
          {dismissedIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setDismissedIds(new Set());
                try { localStorage.removeItem(DISMISS_KEY); } catch { /* noop */ }
              }}
              className="text-[9px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors"
            >
              Restaurar
            </button>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className="text-[9px] font-semibold text-sp-admin-muted hover:text-sp-admin-text transition-colors"
            title={collapsed ? 'Expandir alertas' : 'Contraer alertas'}
          >
            {collapsed ? `▼ Ver (${visible.length})` : '▲ Contraer'}
          </button>
          <Link
            href="/admin/analytics#analitica-alertas"
            className="text-[9px] font-bold text-sp-admin-accent hover:underline"
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Lista de alertas (solo cuando expandida) */}
      {!collapsed && (
        <div>
          {typeOrder.map((type) => {
            const typeAlerts = groups.get(type) ?? [];
            if (typeAlerts.length === 1 && typeAlerts[0]) {
              return (
                <AlertItem
                  key={typeAlerts[0].id}
                  alert={typeAlerts[0]}
                  onDismiss={dismiss}
                  onSnooze={snooze}
                />
              );
            }
            return (
              <AlertGroup
                key={type}
                type={type}
                alerts={typeAlerts}
                onDismiss={dismiss}
                onSnooze={snooze}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
