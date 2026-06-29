'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TalentSocialsEditor } from './TalentSocialsEditor';
import { TalentTagsEditor } from './TalentTagsEditor';
import { TalentGiveawaysSection } from './TalentGiveawaysSection';
import { ArchiveTalentDialog } from './ArchiveTalentDialog';
import type {
  TalentWithRelations,
  TalentBusiness,
  CampaignRow,
  InvoiceWithRelations,
  GiveawayWithTalent,
  CreatorCodeWithTalent,
} from '@/types';
import type { CrmBrandPickerEntry } from '@/lib/queries/crmBrands';
import type { TrackerSummary, TrackerSubtypeCounts } from '@/lib/queries/deal-trackers';
import { TrackerProgressBar } from '@/features/admin/trackers/components/TrackerProgressBar';
import { TrackerStatusBadge } from '@/features/admin/trackers/components/TrackerStatusBadge';

const TABS = ['resumen', 'campanas', 'entregables', 'redes', 'codigos', 'sorteos', 'contacto', 'config'] as const;
type Tab = typeof TABS[number];

function isValidTab(v: string): v is Tab {
  return (TABS as readonly string[]).includes(v);
}

type Props = {
  readonly talent: TalentWithRelations;
  readonly business: TalentBusiness | null;
  readonly campaigns: readonly CampaignRow[];
  readonly invoices: readonly InvoiceWithRelations[];
  readonly liveStatus: { isLive: boolean; platform: string | null; viewerCount: number | null } | null;
  readonly fallbackCount: number;
  readonly giveaways: readonly GiveawayWithTalent[];
  readonly codes: readonly CreatorCodeWithTalent[];
  readonly brandCatalog: readonly CrmBrandPickerEntry[];
  readonly brandMap: Readonly<Record<number, string>>;
  readonly trackers: readonly TrackerSummary[];
  readonly trackerSubtypeCounts: TrackerSubtypeCounts;
  readonly defaultTab: string;
  readonly isStaffRole: boolean;
  readonly isAdmin: boolean;
  readonly setFeaturedLiveAction: () => Promise<void>;
  readonly setFeaturedFallbackAction: () => Promise<void>;
  readonly setExcludeFromLiveAction: () => Promise<void>;
  readonly archiveAction: () => Promise<void>;
  readonly restoreAction: () => Promise<void>;
};

const TAB_LABELS: Record<Tab, string> = {
  resumen:      'Resumen',
  campanas:     'Campañas',
  entregables:  'Entregables',
  redes:        'Redes',
  codigos:      'Códigos',
  sorteos:      'Sorteos',
  contacto:     'Contacto',
  config:       'Config',
};

const TRACKER_SUBTYPE_LABELS: Record<string, string> = {
  dedicated_video: 'Videos',
  preroll:         'Prerolls',
  stream:          'Streams',
};

const STATUS_COLORS: Record<string, string> = {
  activa: '#16a34a', negociacion: '#8b3aad', pausada: '#f59e0b',
  finalizada: '#5b9bd5', cancelada: '#ef4444', propuesta: '#f5632a',
  aprobada: '#16a34a', completada: '#5b9bd5', pendiente_pago: '#f59e0b',
};

function formatMoney(n: string | number | null | undefined): string {
  if (!n) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(Number(n));
}

function SectionLabel({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted mb-2">{children}</p>;
}

function ContactRow({ icon, color, label, value, href }: {
  readonly icon: string;
  readonly color: string;
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[12px] shrink-0" style={{ background: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-sp-admin-muted uppercase tracking-wide leading-none">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-[12px] font-medium text-sp-admin-accent hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-[12px] font-medium text-sp-admin-text truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

function LiveToggleRow({ label, description, action, active, activeClass, disabled = false }: {
  readonly label: string;
  readonly description: string;
  readonly action: () => Promise<void>;
  readonly active: boolean;
  readonly activeClass: string;
  readonly disabled?: boolean;
}): React.ReactElement {
  const toggle = (
    <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? activeClass : 'bg-sp-admin-border'}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${active ? 'left-4' : 'left-0.5'}`} />
    </div>
  );
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-sp-admin-text">{label}</p>
        <p className="text-[10px] text-sp-admin-muted leading-tight">{description}</p>
      </div>
      {disabled ? (
        <span className="opacity-30 cursor-not-allowed shrink-0">{toggle}</span>
      ) : (
        <form action={action} className="shrink-0">
          <button type="submit" title={active ? `Desactivar ${label}` : `Activar ${label}`}>
            {toggle}
          </button>
        </form>
      )}
    </div>
  );
}

export function TalentDetailTabs({
  talent,
  business,
  campaigns,
  invoices,
  liveStatus,
  fallbackCount,
  giveaways,
  codes,
  brandCatalog,
  brandMap,
  trackers,
  trackerSubtypeCounts,
  defaultTab,
  isStaffRole,
  isAdmin,
  setFeaturedLiveAction,
  setFeaturedFallbackAction,
  setExcludeFromLiveAction,
  archiveAction,
  restoreAction,
}: Props): React.ReactElement {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (!isValidTab(defaultTab)) return 'resumen';
    if (isStaffRole && (defaultTab === 'codigos' || defaultTab === 'sorteos')) return 'resumen';
    return defaultTab;
  });

  function changeTab(tab: Tab): void {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  const visibleTabs = isStaffRole
    ? TABS.filter((t) => t !== 'codigos' && t !== 'sorteos')
    : TABS;

  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">

      {/* Tab bar */}
      <div className="border-b border-sp-admin-border/60 bg-sp-admin-hover/40 px-2 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => changeTab(tab)}
              className={`px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-sp-admin-accent text-sp-admin-accent'
                  : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESUMEN ──────────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="p-4 space-y-4">

          {/* Mini campañas */}
          <div>
            <SectionLabel>Últimas campañas</SectionLabel>
            {campaigns.length === 0 ? (
              <p className="text-[12px] text-sp-admin-muted py-2">Sin tratos asociados</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-sp-admin-border/60">
                <table className="w-full">
                  <thead>
                    <tr className="bg-sp-admin-hover/30">
                      {['Trato', 'Estado', 'Talento', 'Margen'].map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((c) => {
                      const margin = Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0);
                      return (
                        <tr key={c.id} className="border-t border-sp-admin-border/40 hover:bg-sp-admin-hover transition-colors">
                          <td className="px-3 py-2 text-[12px] font-medium text-sp-admin-text max-w-[160px] truncate">{c.name}</td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] font-bold" style={{ color: STATUS_COLORS[c.status] ?? '#888' }}>
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px] tabular-nums text-sp-admin-text">{formatMoney(c.amountTalent)}</td>
                          <td className="px-3 py-2 text-[12px] font-bold tabular-nums" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                            {formatMoney(String(margin))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {campaigns.length > 5 && (
              <button
                type="button"
                onClick={() => changeTab('campanas')}
                className="mt-1.5 text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity"
              >
                Ver {campaigns.length - 5} más →
              </button>
            )}
          </div>

          {/* Mini facturación */}
          {invoices.length > 0 && (
            <div>
              <SectionLabel>Últimos movimientos</SectionLabel>
              <div className="divide-y divide-sp-admin-border/40 rounded-lg border border-sp-admin-border/60 overflow-hidden">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-3 py-2 hover:bg-sp-admin-hover transition-colors">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-sp-admin-text truncate">{inv.concept}</p>
                      <p className="text-[10px] text-sp-admin-muted">{new Date(inv.issueDate).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-[12px] font-bold tabular-nums ${inv.kind === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {inv.kind === 'expense' ? '−' : '+'}{formatMoney(inv.totalAmount)}
                      </p>
                      <p className="text-[9px] text-sp-admin-muted uppercase">{inv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información interna */}
          <div className="rounded-lg border border-sp-admin-border/60 overflow-hidden">
            <div className="px-3 py-2 bg-sp-admin-hover/40 border-b border-sp-admin-border/60">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Información interna</p>
            </div>
            <div className="p-4 space-y-4">

              {/* Contacto rápido */}
              <div className="space-y-2.5">
                {business?.telegram && (
                  <ContactRow icon="✈" color="#2AABEE" label="Telegram" value={`@${business.telegram}`}
                    href={`https://t.me/${business.telegram.replace('@', '')}`} />
                )}
                {business?.discord && <ContactRow icon="🎮" color="#5865F2" label="Discord" value={business.discord} />}
                {business?.whatsapp && (
                  <ContactRow icon="💬" color="#25D366" label="WhatsApp" value={business.whatsapp}
                    href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`} />
                )}
                {business?.contactEmail && (
                  <ContactRow icon="✉" color="#888" label="Email" value={business.contactEmail}
                    href={`mailto:${business.contactEmail}`} />
                )}
                {!business?.telegram && !business?.discord && !business?.whatsapp && !business?.contactEmail && (
                  <p className="text-[12px] text-sp-admin-muted">Sin datos de contacto</p>
                )}
                <Link href={`/admin/talents/${talent.id}/negocio`}
                  className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity block">
                  Editar contacto →
                </Link>
              </div>

              {/* Etiquetas */}
              <div className="border-t border-sp-admin-border/40 pt-3">
                <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-2">Etiquetas</p>
                <TalentTagsEditor talentId={talent.id} initialTags={talent.tags} />
              </div>

              {/* Live toggles inline */}
              <div className="border-t border-sp-admin-border/40 pt-3 space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">Live</p>
                <LiveToggleRow
                  label="Destacado principal"
                  description="Aparece como streamer principal cuando está en directo"
                  action={setFeaturedLiveAction}
                  active={talent.featuredLive}
                  activeClass="bg-sp-orange"
                />
                <LiveToggleRow
                  label="Grid offline"
                  description={`Aparece cuando nadie está live · ${fallbackCount}/10`}
                  action={setFeaturedFallbackAction}
                  active={talent.featuredFallback ?? false}
                  activeClass="bg-[#8b3aad]"
                  disabled={!talent.featuredFallback && fallbackCount >= 10}
                />
                <LiveToggleRow
                  label="Excluir de live"
                  description="No aparece en live aunque esté en directo"
                  action={setExcludeFromLiveAction}
                  active={talent.excludeFromLive}
                  activeClass="bg-red-400"
                />
              </div>

              {/* Notas internas */}
              {business?.internalNotes && (
                <div className="border-t border-sp-admin-border/40 pt-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1.5">Notas internas</p>
                  <p className="text-[13px] text-sp-admin-text leading-relaxed whitespace-pre-wrap">{business.internalNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPAÑAS ─────────────────────────────────────────────────────── */}
      {activeTab === 'campanas' && (
        <div className="p-4">
          {campaigns.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12px] text-sp-admin-muted">Sin tratos asociados todavía</p>
              <Link href="/admin/campanas" className="mt-2 text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 block">
                Crear primer trato →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-sp-admin-border/60">
              <table className="w-full">
                <thead>
                  <tr className="bg-sp-admin-hover/30">
                    {['Trato', 'Marca', 'Estado', 'Talento', 'Margen', 'Inicio'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const margin = Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0);
                    const brandName = c.brandId ? (brandMap[c.brandId] ?? '—') : '—';
                    return (
                      <tr key={c.id} className="border-t border-sp-admin-border/40 hover:bg-sp-admin-hover transition-colors">
                        <td className="px-4 py-2.5 text-[12px] font-medium text-sp-admin-text max-w-[180px] truncate">{c.name}</td>
                        <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted whitespace-nowrap">{brandName}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] font-bold" style={{ color: STATUS_COLORS[c.status] ?? '#888' }}>
                            {c.status.charAt(0).toUpperCase() + c.status.slice(1).replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] tabular-nums text-sp-admin-text">{formatMoney(c.amountTalent)}</td>
                        <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                          {formatMoney(String(margin))}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted whitespace-nowrap">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString('es-ES') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REDES ────────────────────────────────────────────────────────── */}
      {activeTab === 'redes' && (
        <div className="p-4">
          <TalentSocialsEditor
            talentId={talent.id}
            socials={talent.socials.map((s) => ({
              id:               s.id,
              platform:         s.platform,
              handle:           s.handle,
              profileUrl:       s.profileUrl ?? null,
              followersDisplay: s.followersDisplay,
              sortOrder:        s.sortOrder,
            }))}
          />
        </div>
      )}

      {/* ── CÓDIGOS ──────────────────────────────────────────────────────── */}
      {activeTab === 'codigos' && !isStaffRole && (
        <TalentGiveawaysSection
          giveaways={giveaways}
          codes={codes}
          talent={{ id: talent.id, name: talent.name, slug: talent.slug }}
          brandCatalog={brandCatalog}
          defaultActiveTab="codes"
          plain
        />
      )}

      {/* ── SORTEOS ──────────────────────────────────────────────────────── */}
      {activeTab === 'sorteos' && !isStaffRole && (
        <TalentGiveawaysSection
          giveaways={giveaways}
          codes={codes}
          talent={{ id: talent.id, name: talent.name, slug: talent.slug }}
          brandCatalog={brandCatalog}
          defaultActiveTab="giveaways"
          plain
        />
      )}

      {/* ── ENTREGABLES ──────────────────────────────────────────────────── */}
      {activeTab === 'entregables' && (
        <div className="p-4">
          {trackers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[12px] text-sp-admin-muted">Sin trackers asociados todavía</p>
              <Link href="/admin/entregables" className="mt-2 text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 block">
                Ir a Entregables →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {trackers.map((tracker) => {
                const sc = trackerSubtypeCounts[tracker.id];
                const hasSubtypes = sc && (sc.dedicated_video > 0 || sc.preroll > 0 || sc.stream > 0);
                return (
                  <Link
                    key={tracker.id}
                    href={`/admin/entregables/${tracker.id}`}
                    className="block rounded-lg border border-sp-admin-border/60 p-3 hover:bg-sp-admin-hover transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-sp-admin-text truncate">{tracker.dealName}</p>
                        <p className="text-[10px] text-sp-admin-muted mt-0.5">{tracker.brandName}</p>
                      </div>
                      <TrackerStatusBadge status={tracker.status} />
                    </div>
                    <TrackerProgressBar
                      current={tracker.currentCount}
                      target={tracker.targetCount}
                      status={tracker.status}
                    />
                    {hasSubtypes && sc && (
                      <div className="flex gap-3 mt-2 pt-2 border-t border-sp-admin-border/40">
                        {(['dedicated_video', 'preroll', 'stream'] as const).map((s) => {
                          const n = sc[s];
                          if (!n) return null;
                          return (
                            <span key={s} className="text-[10px] text-sp-admin-muted">
                              <span className="font-bold text-sp-admin-text">{n}</span> {TRACKER_SUBTYPE_LABELS[s]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </Link>
                );
              })}
              <Link
                href="/admin/entregables"
                className="block text-center text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity pt-1"
              >
                Ver todos los trackers →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── CONTACTO ─────────────────────────────────────────────────────── */}
      {activeTab === 'contacto' && (
        <div className="p-4 space-y-3 max-w-md">
          {business?.telegram && (
            <ContactRow icon="✈" color="#2AABEE" label="Telegram" value={`@${business.telegram}`}
              href={`https://t.me/${business.telegram.replace('@', '')}`} />
          )}
          {business?.discord && <ContactRow icon="🎮" color="#5865F2" label="Discord" value={business.discord} />}
          {business?.whatsapp && (
            <ContactRow icon="💬" color="#25D366" label="WhatsApp" value={business.whatsapp}
              href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`} />
          )}
          {business?.contactEmail && (
            <ContactRow icon="✉" color="#888" label="Email" value={business.contactEmail}
              href={`mailto:${business.contactEmail}`} />
          )}
          {!business?.telegram && !business?.discord && !business?.whatsapp && !business?.contactEmail && (
            <p className="text-[12px] text-sp-admin-muted py-2">Sin datos de contacto</p>
          )}
          {business?.managerName && (
            <div className="pt-2 border-t border-sp-admin-border/50">
              <p className="text-[9px] font-bold text-sp-admin-muted uppercase tracking-wide mb-1">Manager</p>
              <p className="text-[12px] font-medium text-sp-admin-text">{business.managerName}</p>
              {business.managerEmail && (
                <a href={`mailto:${business.managerEmail}`} className="text-[11px] text-sp-admin-accent hover:underline">
                  {business.managerEmail}
                </a>
              )}
            </div>
          )}
          <div className="pt-2 border-t border-sp-admin-border/50">
            <Link href={`/admin/talents/${talent.id}/negocio`}
              className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
              Editar contacto →
            </Link>
          </div>
        </div>
      )}

      {/* ── CONFIG ───────────────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="p-4 space-y-4">
          {/* Live status */}
          <div>
            {liveStatus?.isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE · {liveStatus.platform?.toUpperCase()} · {liveStatus.viewerCount?.toLocaleString('es-ES') ?? '—'} viewers
              </span>
            ) : (
              <span className="text-[11px] text-sp-admin-muted">Estado: Offline</span>
            )}
          </div>

          {/* Toggles */}
          <div className="rounded-lg border border-sp-admin-border/60 p-4 space-y-3">
            <SectionLabel>Ajustes Live</SectionLabel>
            <LiveToggleRow
              label="Destacado principal"
              description="Aparece como streamer principal cuando está en directo"
              action={setFeaturedLiveAction}
              active={talent.featuredLive}
              activeClass="bg-sp-orange"
            />
            <LiveToggleRow
              label="Grid offline"
              description={`Aparece cuando nadie está live · ${fallbackCount}/10 seleccionados`}
              action={setFeaturedFallbackAction}
              active={talent.featuredFallback ?? false}
              activeClass="bg-[#8b3aad]"
              disabled={!talent.featuredFallback && fallbackCount >= 10}
            />
            <LiveToggleRow
              label="Excluir de live"
              description="No aparece en la sección live aunque esté en directo"
              action={setExcludeFromLiveAction}
              active={talent.excludeFromLive}
              activeClass="bg-red-400"
            />
          </div>

          {/* Edit links */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/talents/${talent.id}/edit`}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent/10 border border-sp-admin-accent/30 text-[12px] font-semibold text-sp-admin-accent hover:bg-sp-admin-accent/20 transition-colors">
              ✎ Editar perfil
            </Link>
            <Link href={`/admin/talents/${talent.id}/negocio`}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
              ✎ Datos negocio
            </Link>
            <Link href="/admin/live"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
              Gestionar roster live →
            </Link>
          </div>

          {/* Danger zone — admin only */}
          {isAdmin && (
            <ArchiveTalentDialog
              talent={{ id: talent.id, name: talent.name, slug: talent.slug, archivedAt: talent.archivedAt }}
              activeCampaignCount={campaigns.filter((c) =>
                ['propuesta', 'negociacion', 'aprobada', 'activa'].includes(c.status),
              ).length}
              activeCodeCount={codes.length}
              activeGiveawayCount={giveaways.filter((g) =>
                !g.endsAt || new Date(g.endsAt) > new Date(),
              ).length}
              archiveAction={archiveAction}
              restoreAction={restoreAction}
            />
          )}
        </div>
      )}
    </div>
  );
}
