import Link from 'next/link';
import type { DashboardAlert, AlertSeverity, AlertSummary } from '@/lib/queries/alerts';
import { AlertResolveButton } from './AlertResolveButton';

type Props = {
  readonly alerts:  readonly DashboardAlert[];
  readonly summary: AlertSummary;
};

// ── Configuración visual ──────────────────────────────────────────────

const SEVERITY_CFG: Record<AlertSeverity, { bar: string; badge: string; label: string; dot: string }> = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500',    label: 'Crítica' },
  high:     { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'Alta'    },
  medium:   { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400',  label: 'Media'   },
  low:      { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-400',   label: 'Baja'    },
};

const TYPE_ICON: Record<string, string> = {
  overdue_task:                 '✓',
  overdue_followup:             '📅',
  unpaid_brand:                 '💰',
  pending_talent:               '💸',
  expiring_deal:                '⏳',
  expired_active:               '⚠️',
  task_due_today_high:          '🔥',
  task_rolled_over:             '↻',
  invoice_overdue:                '📄',
  deal_brand_paid_talent_pending: '⚡',
  issued_invoice_overdue:         '🧾',
  issued_invoice_due_soon:        '⏰',
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// ── Subcomponentes ────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }): React.ReactElement {
  const cfg = SEVERITY_CFG[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${cfg.badge}`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AlertItem({ alert }: { readonly alert: DashboardAlert }): React.ReactElement {
  const cfg  = SEVERITY_CFG[alert.severity];
  const icon = TYPE_ICON[alert.type] ?? '•';

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-sp-admin-hover/40 transition-colors border-b border-sp-admin-border/40 last:border-0">
      {/* Barra lateral de severidad */}
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${cfg.bar}`} />

      {/* Icono */}
      <span className="text-[14px] leading-none mt-0.5 shrink-0 select-none" aria-hidden>{icon}</span>

      {/* Contenido */}
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
              <span className="text-[10px] font-bold tabular-nums text-sp-admin-text">
                {EUR.format(alert.amount)}
              </span>
            </>
          )}
          {alert.daysInfo && (
            <>
              <span className="text-sp-admin-muted/40 text-[10px]">·</span>
              <span className={`text-[10px] font-semibold ${
                alert.severity === 'critical' || alert.severity === 'high'
                  ? 'text-red-500'
                  : 'text-amber-600'
              }`}>
                {alert.daysInfo}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 shrink-0">
        {alert.resolveHint && (
          <AlertResolveButton hint={alert.resolveHint} />
        )}
        <Link
          href={alert.href}
          className="text-[10px] font-bold text-sp-admin-accent hover:underline whitespace-nowrap"
        >
          Ver →
        </Link>
      </div>
    </div>
  );
}

// ── Card "Hoy requiere atención" ──────────────────────────────────────

function AttentionSummary({ summary }: { readonly summary: AlertSummary }): React.ReactElement {
  const items: { count: number; label: string; href: string; accent: string }[] = [
    { count: summary.overdueTasksCount,     label: 'tareas vencidas',       href: '/admin/tareas',   accent: '#dc2626' },
    { count: summary.overdueFollowupsCount, label: 'follow-ups vencidos',   href: '/admin/brands',   accent: '#ea580c' },
    { count: summary.unpaidBrandCount,      label: 'cobros pendientes',     href: '/admin/campanas', accent: '#d97706' },
    { count: summary.pendingTalentCount,    label: 'pagos a talentos',      href: '/admin/campanas', accent: '#f59e0b' },
    { count: summary.expiringDealsCount,    label: 'tratos vencen pronto',  href: '/admin/campanas', accent: '#2563eb' },
  ].filter((i) => i.count > 0);

  if (items.length === 0) return <></>;

  const totalUrgent = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="rounded-xl bg-sp-admin-card border border-amber-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-amber-500 text-[14px]" aria-hidden>⚡</span>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">
          Hoy requiere atención
        </p>
        <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
          {totalUrgent} {totalUrgent === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sp-admin-border bg-sp-admin-hover/30 hover:bg-sp-admin-hover text-[11px] font-semibold text-sp-admin-text transition-colors"
          >
            <span className="font-black tabular-nums" style={{ color: item.accent }}>{item.count}</span>
            <span className="text-sp-admin-muted">{item.label}</span>
          </Link>
        ))}
      </div>
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
        {[
          { label: 'Revisar leads',      href: '/admin/brands'  },
          { label: 'Actualizar talentos', href: '/admin/talents' },
          { label: 'Crear follow-ups',   href: '/admin/brands'  },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="text-[11px] font-semibold text-sp-admin-accent hover:underline"
          >
            {s.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export function DashboardAlerts({ alerts, summary }: Props): React.ReactElement {
  if (summary.total === 0) return <EmptyState />;

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const high     = alerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="space-y-2">

      {/* Card "Hoy requiere atención" */}
      <AttentionSummary summary={summary} />

      {/* Lista de alertas */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden border border-sp-admin-border">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30">
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">
              Alertas críticas
            </p>
            {critical > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-50 text-red-700 border border-red-200">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                {critical} crítica{critical !== 1 ? 's' : ''}
              </span>
            )}
            {high > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                <span className="w-1 h-1 rounded-full bg-orange-500" />
                {high} alta{high !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-sp-admin-muted/60">
              {summary.total} en total · mostrando {alerts.length}
            </span>
            <Link href="/admin/analytics#analitica-alertas"
              className="text-[9px] font-bold text-sp-admin-accent hover:underline">
              Ver todas →
            </Link>
          </div>
        </div>

        {/* Items */}
        <div>
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      </div>

    </div>
  );
}
