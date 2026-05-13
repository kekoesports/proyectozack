'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';
import {
  subscribe,
  getConsentSnapshot,
  getServerSnapshot,
  saveConsent,
} from '@/lib/consent/consentStore';

// ── Toggle switch accesible ───────────────────────────────────────────────────

function Toggle({
  checked,
  disabled,
  onToggle,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sp-orange focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'bg-sp-orange' : 'bg-white/15',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

// ── Categorías ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'necessary' as const,
    label: 'Necesarias',
    description: 'Sesión de usuario, preferencias básicas. No se pueden desactivar.',
    locked: true,
  },
  {
    id: 'analytics' as const,
    label: 'Analíticas',
    description: 'Google Analytics (vía GTM) y Vercel Analytics. Ayudan a mejorar el sitio.',
    locked: false,
  },
  {
    id: 'marketing' as const,
    label: 'Marketing',
    description: 'Remarketing y publicidad personalizada. Actualmente no se usan activamente.',
    locked: false,
  },
];

// ── Banner principal ──────────────────────────────────────────────────────────

type Panel = 'banner' | 'configure';

export function CookieBanner() {
  const consent = useSyncExternalStore(subscribe, getConsentSnapshot, getServerSnapshot);

  // Esperar al hydration + delay antes de mostrar el banner
  const [visible, setVisible] = useState(false);
  const [panel, setPanel]     = useState<Panel>('banner');

  // Estado local del panel de configuración
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  // Mostrar banner tras breve delay si no hay consentimiento previo
  useEffect(() => {
    if (consent !== null) return;
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, [consent]);

  // Escuchar evento de "Gestionar cookies" desde el Footer
  useEffect(() => {
    const handler = () => {
      const current = getConsentSnapshot();
      setAnalyticsOn(current?.analytics ?? false);
      setMarketingOn(current?.marketing ?? false);
      setPanel(current !== null ? 'configure' : 'banner');
      setVisible(true);
    };
    window.addEventListener('sp:open-consent', handler);
    return () => window.removeEventListener('sp:open-consent', handler);
  }, []);

  // Esc cierra el panel de configuración volviendo al banner (no descarta el banner)
  useEffect(() => {
    if (!visible || panel !== 'configure') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel('banner');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, panel]);

  const close = useCallback(() => setVisible(false), []);

  const acceptAll = useCallback(() => {
    saveConsent({ analytics: true, marketing: true });
    close();
  }, [close]);

  const rejectAll = useCallback(() => {
    saveConsent({ analytics: false, marketing: false });
    close();
  }, [close]);

  const savePreferences = useCallback(() => {
    const prev = getConsentSnapshot();
    saveConsent({ analytics: analyticsOn, marketing: marketingOn });
    // Si el usuario tenía analytics activo y ahora lo revoca,
    // GTM ya está en memoria — recargamos para limpiar el estado.
    if (prev?.analytics === true && !analyticsOn) {
      window.location.reload();
      return;
    }
    close();
  }, [analyticsOn, marketingOn, close]);

  const openConfigure = useCallback(() => {
    const current = getConsentSnapshot();
    setAnalyticsOn(current?.analytics ?? false);
    setMarketingOn(current?.marketing ?? false);
    setPanel('configure');
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Consentimiento de cookies"
      className={[
        // Mobile: anchored full-width bottom sheet
        // Desktop: card at bottom-left (WhatsApp widget is at bottom-right)
        'fixed bottom-0 left-0 right-0 z-50',
        'sm:bottom-4 sm:left-4 sm:right-auto sm:w-[440px]',
        // Styling
        'bg-[#0d0d0f]/98 backdrop-blur-md',
        'border-t border-white/10 sm:border sm:rounded-2xl',
        'shadow-[0_0_40px_rgba(0,0,0,0.7),0_8px_32px_rgba(0,0,0,0.5)]',
        'transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      ].join(' ')}
    >
      {/* Accent line — solo en desktop (tiene rounded) */}
      <div className="hidden sm:block absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-sp-orange/50 to-transparent" />

      <div className="p-5">
        {panel === 'banner' ? (
          <BannerPanel
            onAcceptAll={acceptAll}
            onReject={rejectAll}
            onConfigure={openConfigure}
          />
        ) : (
          <ConfigurePanel
            analyticsOn={analyticsOn}
            marketingOn={marketingOn}
            onToggleAnalytics={() => setAnalyticsOn((v) => !v)}
            onToggleMarketing={() => setMarketingOn((v) => !v)}
            onSave={savePreferences}
            onAcceptAll={acceptAll}
            onBack={() => setPanel('banner')}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-panel: banner inicial ─────────────────────────────────────────────────

function BannerPanel({
  onAcceptAll,
  onReject,
  onConfigure,
}: {
  onAcceptAll: () => void;
  onReject:    () => void;
  onConfigure: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-sp-orange mb-1.5">
          SocialPro · Cookies
        </p>
        <p className="text-sm text-white/75 leading-relaxed">
          Usamos cookies propias y de terceros para analítica y mejorar tu experiencia.
          Puedes aceptar todas, rechazarlas o configurar tus preferencias.
        </p>
        <p className="text-[11px] text-white/30 mt-2">
          <Link href="/privacidad" className="underline hover:text-white/55 transition-colors">Privacidad</Link>
          <span className="mx-1.5 text-white/15">·</span>
          <Link href="/cookies" className="underline hover:text-white/55 transition-colors">Política de cookies</Link>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onReject}
          className="h-8 px-4 rounded-lg border border-white/15 text-[12px] font-semibold text-white/55 hover:text-white/80 hover:border-white/30 transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={onConfigure}
          className="h-8 px-4 rounded-lg border border-white/15 text-[12px] font-semibold text-white/55 hover:text-white/80 hover:border-white/30 transition-colors"
        >
          Configurar
        </button>
        <button
          onClick={onAcceptAll}
          className="h-8 px-5 rounded-lg bg-sp-orange text-[12px] font-bold text-white hover:opacity-90 transition-opacity ml-auto"
        >
          Aceptar todo
        </button>
      </div>
    </div>
  );
}

// ── Sub-panel: configuración de categorías ────────────────────────────────────

function ConfigurePanel({
  analyticsOn,
  marketingOn,
  onToggleAnalytics,
  onToggleMarketing,
  onSave,
  onAcceptAll,
  onBack,
}: {
  analyticsOn:       boolean;
  marketingOn:       boolean;
  onToggleAnalytics: () => void;
  onToggleMarketing: () => void;
  onSave:            () => void;
  onAcceptAll:       () => void;
  onBack:            () => void;
}) {
  const toggleMap: Record<string, { checked: boolean; onToggle?: (() => void) | undefined }> = {
    necessary: { checked: true },
    analytics: { checked: analyticsOn, onToggle: onToggleAnalytics },
    marketing: { checked: marketingOn, onToggle: onToggleMarketing },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="text-white/30 hover:text-white/60 transition-colors text-sm leading-none"
        >
          ←
        </button>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-sp-orange">
          Preferencias de cookies
        </p>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const state = toggleMap[cat.id];
          return (
            <div
              key={cat.id}
              className="flex items-start gap-3 py-2.5 border-b border-white/[0.06] last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white leading-snug">{cat.label}</p>
                <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">{cat.description}</p>
              </div>
              <div className="shrink-0 mt-0.5">
                {cat.locked ? (
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    Siempre
                  </span>
                ) : state?.onToggle ? (
                  <Toggle
                    checked={state.checked}
                    onToggle={state.onToggle}
                    label={`${cat.label} ${state.checked ? 'activado' : 'desactivado'}`}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          className="flex-1 h-8 rounded-lg border border-white/15 text-[12px] font-semibold text-white/70 hover:text-white hover:border-white/30 transition-colors"
        >
          Guardar preferencias
        </button>
        <button
          onClick={onAcceptAll}
          className="flex-1 h-8 rounded-lg bg-sp-orange text-[12px] font-bold text-white hover:opacity-90 transition-opacity"
        >
          Aceptar todo
        </button>
      </div>
    </div>
  );
}
