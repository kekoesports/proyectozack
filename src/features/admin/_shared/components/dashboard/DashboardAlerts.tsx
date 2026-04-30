import Link from 'next/link';
import type { DashboardAlert, AlertSeverity, AlertSummary } from '@/lib/queries/alerts';

type Props = {
  readonly alerts:  readonly DashboardAlert[];
  readonly summary: AlertSummary;
};

// ── Configuración visual ──────────────────────────────────────────────

const SEVERITY_CFG: Record<AlertSeverity, { bar: string; badge: string; label: string }> = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',     label: 'Crítica' },
  high:     { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Alta' },
  medium:   { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Media' },
  low:      { bar: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Baja' },
};

const TYPE_ICON: Record<string, string> = {
  overdue_task:     '✓',
  overdue_followup: '📅',
  unpaid_brand:     '€',
  pending_talent:   '💸',
  expiring_deal:    '⏳',
  expired_active:   '⚠',
};

// ── Subcomponentes ────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }): React.ReactElement {
  const cfg = SEVERITY_CFG[severity];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function AlertItem({ alert }: { readonly alert: DashboardAlert }): React.ReactElement {
  const cfg  = SEVERITY_CFG[alert.severity];
  const icon = TYPE_ICON[alert.type] ?? '•';

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-sp-admin-hover/40 transition-colors group/alert border-b border-sp-admin-border/40 last:border-0">
      {/* Barra lateral de severidad */}
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${cfg.bar}`} />

      {/* Icono */}
      <span className="text-[13px] leading-none mt-0.5 shrink-0 select-none">{icon}</span>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-semibold text-sp-admin-text leading-snug truncate">{alert.title}</p>
          <SeverityBadge severity={alert.severity} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-sp-admin-muted truncate">{alert.description}</span>
          {alert.daysInfo && (
            <>
              <span className="text-sp-admin-muted/40 text-[10px]">·</span>
              <span className={`text-[10px] font-semibold ${alert.severity === 'critical' || alert.severity === 'high' ? 'text-red-500' : 'text-amber-600'}`}>
                {alert.daysInfo}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Acción */}
      <Link href={alert.href}
        className="shrink-0 opacity-0 group-hover/alert:opacity-100 transition-opacity text-[10px] font-bold text-sp-admin-accent hover:underline">
        Ver →
      </Link>
    </div>
  );
}

// ── Card "Hoy requiere atención" ──────────────────────────────────────

function AttentionSummary({ summary }: { readonly summary: AlertSummary }): React.ReactElement {
  const items: { count: number; label: string; href: string; accent: string }[] = [
    { count: summary.overdueTasksCount,     label: 'tareas vencidas',        href: '/admin/tareas',    accent: '#dc2626' },
    { count: summary.overdueFollowupsCount, label: 'follow-ups vencidos',    href: '/admin/brands',    accent: '#ea580c' },
    { count: summary.unpaidBrandCount,      label: 'cobros pendientes',      href: '/admin/campanas',  accent: '#d97706' },
    { count: summary.pendingTalentCount,    label: 'pagos a talentos',       href: '/admin/campanas',  accent: '#f59e0b' },
    { count: summary.expiringDealsCount,    label: 'tratos vencen pronto',   href: '/admin/campanas',  accent: '#2563eb' },
  ].filter((i) => i.count > 0);

  if (items.length === 0) return <></>;

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted mb-2">Hoy requiere atención</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link key={item.label} href={item.href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sp-admin-border bg-sp-admin-hover/30 hover:bg-sp-admin-hover text-[11px] font-semibold text-sp-admin-text transition-colors">
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
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-6 text-center">
      <p className="text-2xl mb-2">✓</p>
      <p className="text-[13px] font-bold text-sp-admin-text">Todo bajo control</p>
      <p className="text-[11px] text-sp-admin-muted mt-1 mb-4">No hay alertas críticas pendientes</p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {[
          { label: 'Revisar leads', href: '/admin/brands' },
          { label: 'Actualizar talentos', href: '/admin/talents' },
          { label: 'Crear follow-ups', href: '/admin/brands' },
        ].map((s) => (
          <Link key={s.label} href={s.href}
            className="text-[11px] font-semibold text-sp-admin-accent hover:underline">
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
      {/* Resumen de atención */}
      <AttentionSummary summary={summary} />

      {/* Lista de alertas */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30">
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Alertas críticas</p>
            {critical > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-50 text-red-700 border border-red-200">
                {critical} crítica{critical !== 1 ? 's' : ''}
              </span>
            )}
            {high > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                {high} alta{high !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-[9px] text-sp-admin-muted/60">{summary.total} en total · mostrando {alerts.length}</span>
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
