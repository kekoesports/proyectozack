'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BellIcon, SettingsIcon } from './SidebarIcons';
import { GlobalSearch } from './GlobalSearch';
import { AlertResolveButton } from './dashboard/AlertResolveButton';
import type { DashboardAlert, AlertSeverity } from '@/lib/queries/alerts';

// ── Quick actions ─────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Nueva tarea',   href: '/admin/tareas',      emoji: '✓' },
  { label: 'Nueva marca',   href: '/admin/brands',      emoji: '🏢' },
  { label: 'Nueva factura', href: '/admin/facturacion', emoji: '€' },
  { label: 'Nuevo talento', href: '/admin/talents',     emoji: '⭐' },
] as const;

// ── Alert helpers ─────────────────────────────────────────────────────

const SEVERITY_DOT: Record<AlertSeverity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-400',
  low:      'bg-blue-400',
};

const SEVERITY_TEXT: Record<AlertSeverity, string> = {
  critical: 'text-red-600',
  high:     'text-orange-600',
  medium:   'text-amber-600',
  low:      'text-blue-500',
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
};

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// ── Props ─────────────────────────────────────────────────────────────

type Props = {
  readonly alertCount?:   number;
  readonly recentAlerts?: readonly DashboardAlert[];
};

// ── Alert dropdown item ───────────────────────────────────────────────

function AlertDropdownItem({ alert, onClose }: { alert: DashboardAlert; onClose: () => void }): React.ReactElement {
  const icon = TYPE_ICON[alert.type] ?? '•';

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-sp-admin-hover transition-colors border-b border-sp-admin-border/40 last:border-0">
      {/* Dot de severidad */}
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[alert.severity]}`} aria-hidden />

      {/* Icono + contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-sp-admin-text leading-tight truncate">
              <span className="mr-1" aria-hidden>{icon}</span>
              {alert.title}
            </p>
            <p className="text-[10px] text-sp-admin-muted mt-0.5 flex items-center gap-1 flex-wrap">
              <span className="truncate">{alert.description}</span>
              {alert.amount !== undefined && alert.amount > 0 && (
                <span className="font-bold text-sp-admin-text tabular-nums shrink-0">
                  · {EUR.format(alert.amount)}
                </span>
              )}
              {alert.daysInfo && (
                <span className={`font-semibold shrink-0 ${SEVERITY_TEXT[alert.severity]}`}>
                  · {alert.daysInfo}
                </span>
              )}
            </p>
          </div>
          {/* Acciones */}
          <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
            <Link
              href={alert.href}
              onClick={onClose}
              className="text-[10px] font-bold text-sp-admin-accent hover:underline"
            >
              Ver
            </Link>
            {alert.resolveHint && (
              <AlertResolveButton hint={alert.resolveHint} compact />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AdminHeader ───────────────────────────────────────────────────────

export function AdminHeader({ alertCount = 0, recentAlerts = [] }: Props): React.ReactElement {
  const [showActions, setShowActions] = useState(false);
  const [showAlerts,  setShowAlerts]  = useState(false);

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const hasAlerts  = alertCount > 0;
  const badgeCount = alertCount > 99 ? '99+' : String(alertCount);

  function closeBoth(): void {
    setShowActions(false);
    setShowAlerts(false);
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-sp-admin-bg/95 backdrop-blur-md border-b border-sp-admin-border/70 flex items-center gap-3 px-4 md:px-6">
      {/* Fecha */}
      <span className="hidden md:block text-[11px] font-medium text-sp-admin-muted capitalize shrink-0 tabular-nums">
        {today}
      </span>
      <div className="hidden md:block h-4 w-px bg-sp-admin-border shrink-0" aria-hidden />

      {/* Búsqueda global */}
      <GlobalSearch />

      {/* Acciones derechas */}
      <div className="flex items-center gap-2 ml-auto">

        {/* + Acciones rápidas */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => { setShowActions((v) => !v); setShowAlerts(false); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 active:scale-95 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Acciones rápidas
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-sp-admin-card border border-sp-admin-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setShowActions(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
                >
                  <span className="text-base leading-none">{a.emoji}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 🔔 Campana con badge y dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowAlerts((v) => !v); setShowActions(false); }}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
            aria-label={hasAlerts ? `${alertCount} alertas activas` : 'Sin alertas'}
          >
            <span className="w-4 h-4 block"><BellIcon /></span>

            {/* Badge de conteo */}
            {hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center px-0.5 leading-none">
                {badgeCount}
              </span>
            )}
          </button>

          {/* Dropdown de alertas */}
          {showAlerts && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-sp-admin-card border border-sp-admin-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {/* Header del dropdown */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">
                    Alertas
                  </p>
                  {hasAlerts && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-red-50 text-red-700 border border-red-200">
                      {alertCount} activa{alertCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <Link
                  href="/admin"
                  onClick={() => setShowAlerts(false)}
                  className="text-[9px] font-bold text-sp-admin-accent hover:underline"
                >
                  Ver todas →
                </Link>
              </div>

              {/* Lista de alertas */}
              {recentAlerts.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[14px] mb-1">✓</p>
                  <p className="text-[12px] font-semibold text-sp-admin-text">Todo bajo control</p>
                  <p className="text-[10px] text-sp-admin-muted mt-0.5">No hay alertas activas</p>
                </div>
              ) : (
                <div>
                  {recentAlerts.map((alert) => (
                    <AlertDropdownItem
                      key={alert.id}
                      alert={alert}
                      onClose={() => setShowAlerts(false)}
                    />
                  ))}
                </div>
              )}

              {/* Footer */}
              {recentAlerts.length > 0 && (
                <div className="px-3 py-2 border-t border-sp-admin-border/60 bg-sp-admin-hover/20">
                  <Link
                    href="/admin#analitica-alertas"
                    onClick={() => setShowAlerts(false)}
                    className="block text-center text-[10px] font-semibold text-sp-admin-accent hover:underline"
                  >
                    Ver todas las alertas ({alertCount}) →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          type="button"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          aria-label="Configuración"
        >
          <span className="w-4 h-4 block"><SettingsIcon /></span>
        </button>
      </div>

      {/* Click outside para cerrar ambos dropdowns */}
      {(showActions || showAlerts) && (
        <div className="fixed inset-0 z-40" onClick={closeBoth} aria-hidden />
      )}
    </header>
  );
}
