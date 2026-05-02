import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { requireAnyRole } from '@/lib/auth-guard';
import { getTalentById } from '@/lib/queries/talents';
import { getTalentBusiness, getTalentVerticals } from '@/lib/queries/talentBusiness';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listInvoices } from '@/lib/queries/invoices';
import { getFlagImageUrl, countryFlagEmoji } from '@/lib/flag-images';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';
import { TalentPhotoUpload } from '@/features/admin/talents/components/TalentPhotoUpload';
import type { TalentVertical } from '@/types';

const PLATFORM_COLOR: Record<string, string> = {
  twitch: '#9147ff', kick: '#53fc18', youtube: '#ff0000',
  instagram: '#e1306c', tiktok: '#010101', x: '#1da1f2', twitter: '#1da1f2',
};
const PLATFORM_LABEL: Record<string, string> = {
  twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube',
  instagram: 'Instagram', tiktok: 'TikTok', x: 'X', twitter: 'X',
};

function formatMoney(n: string | number | null | undefined): string {
  if (!n) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n));
}

export default async function TalentProfilePage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const talentId = Number(id);
  if (isNaN(talentId)) notFound();

  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const [talent, business, verticals, campaigns, invoices] = await Promise.all([
    getTalentById(talentId),
    getTalentBusiness(talentId),
    getTalentVerticals(talentId),
    listCampaigns({ filters: { talentId } }),
    listInvoices({ talentId }),
  ]);

  if (!talent) notFound();

  const flagImg   = talent.creatorCountry ? getFlagImageUrl(talent.creatorCountry) : null;
  const flagEmoji = talent.creatorCountry ? countryFlagEmoji(talent.creatorCountry) : null;
  const isActive  = talent.status !== 'inactive';
  const incomeTotal     = invoices.filter((i) => i.kind === 'income').reduce((s, i) => s + Number(i.totalAmount), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === 'activa').length;

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted">
        <Link href="/admin/talents" className="hover:text-sp-admin-accent transition-colors">Influencers</Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium">{talent.name}</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="h-28 w-full"
          style={{ background: `linear-gradient(135deg, ${talent.gradientC1}88, ${talent.gradientC2}88)` }} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4 flex-wrap gap-3">
            <TalentPhotoUpload
              talentId={talent.id}
              talentName={talent.name}
              initials={talent.initials}
              gradientC1={talent.gradientC1}
              gradientC2={talent.gradientC2}
              photoUrl={talent.photoUrl ?? null}
            />
            <div className="flex items-center gap-2">
              <Link href={`/admin/talents/${talent.id}/negocio`}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
                ✎ Editar datos
              </Link>
              <Link href="/admin/campanas"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors">
                + Nueva campaña
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-sp-admin-text">{talent.name}</h1>
                {talent.creatorCountry && (
                  <span className="flex items-center gap-1.5">
                    {flagImg ? (
                      <img src={flagImg} alt={talent.creatorCountry} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg">{flagEmoji}</span>
                    )}
                    <span className="text-[11px] font-semibold text-sp-admin-muted">{talent.creatorCountry}</span>
                  </span>
                )}
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isActive ? 'Activo' : 'Inactivo'}
                </span>
                {!talent.photoUrl && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Sin foto
                  </span>
                )}
              </div>
              {talent.game && <p className="text-[13px] text-sp-admin-muted mt-0.5">{talent.game}</p>}
              {(verticals as TalentVertical[]).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(verticals as TalentVertical[]).map((v) => (
                    <span key={v} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sp-admin-hover border border-sp-admin-border text-sp-admin-muted">
                      {TALENT_VERTICAL_LABELS[v] ?? v}
                    </span>
                  ))}
                </div>
              )}
              {talent.socials.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {talent.socials.map((s) => {
                    const key   = s.platform.toLowerCase();
                    const color = PLATFORM_COLOR[key] ?? '#888';
                    const label = PLATFORM_LABEL[key] ?? s.platform;
                    return (
                      <a key={s.id} href={s.profileUrl ?? '#'} target={s.profileUrl ? '_blank' : '_self'} rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white hover:opacity-85 transition-opacity"
                        style={{ background: color }}>
                        {label}
                        {s.followersDisplay && s.followersDisplay !== '0' && (
                          <span className="opacity-80">· {s.followersDisplay}</span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Campañas',      value: campaigns.length,        color: '#f5632a' },
          { label: 'Activas',       value: activeCampaigns,         color: '#16a34a' },
          { label: 'Revenue total', value: formatMoney(incomeTotal), color: '#8b3aad' },
          { label: 'Plataformas',   value: talent.socials.length,   color: '#5b9bd5' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: k.color }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{k.label}</p>
              <p className="text-lg font-bold mt-0.5 tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grid 3 cols ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Columna izq */}
        <div className="space-y-4">

          {/* Redes */}
          <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Redes sociales</h2>
            </div>
            {talent.socials.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-sp-admin-muted text-center">Sin redes registradas</p>
            ) : (
              <div className="divide-y divide-sp-admin-border/40">
                {talent.socials.map((s) => {
                  const key   = s.platform.toLowerCase();
                  const color = PLATFORM_COLOR[key] ?? '#888';
                  const label = PLATFORM_LABEL[key] ?? s.platform;
                  return (
                    <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: color }}>
                        {label.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-sp-admin-text">{label}</p>
                        <p className="text-[10px] text-sp-admin-muted truncate">@{s.handle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-sp-admin-text tabular-nums">{s.followersDisplay || '—'}</p>
                        {s.avgViewers && (
                          <p className="text-[9px] text-sp-admin-muted">{s.avgViewers.toLocaleString('es-ES')} viewers</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-sp-admin-border/60 bg-sp-admin-hover/20">
              <Link href={`/admin/talents/${talent.id}/negocio`} className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                Editar redes →
              </Link>
            </div>
          </section>

          {/* Contacto */}
          <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Contacto</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5">
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
            </div>
            <div className="px-4 py-2.5 border-t border-sp-admin-border/60 bg-sp-admin-hover/20">
              <Link href={`/admin/talents/${talent.id}/negocio`} className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                Editar contacto →
              </Link>
            </div>
          </section>
        </div>

        {/* Columna der */}
        <div className="lg:col-span-2 space-y-4">

          {/* Campañas */}
          <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Tratos / Campañas</h2>
              <Link href="/admin/campanas" className="text-[10px] text-sp-admin-accent hover:opacity-70 transition-opacity">Ver todos →</Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] text-sp-admin-muted">Sin tratos asociados todavía</p>
                <Link href="/admin/campanas" className="mt-2 text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 block">
                  Crear primer trato →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                      {['Trato', 'Marca', 'Estado', 'Pago talento', 'Margen'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const margin = Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0);
                      const statusColors: Record<string, string> = {
                        activa: '#16a34a', negociacion: '#8b3aad', pausada: '#f59e0b',
                        finalizada: '#5b9bd5', cancelada: '#ef4444', propuesta: '#f5632a',
                        aprobada: '#16a34a', completada: '#5b9bd5', pendiente_pago: '#f59e0b',
                      };
                      return (
                        <tr key={c.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                          <td className="px-4 py-2.5 text-[12px] font-medium text-sp-admin-text">{c.name}</td>
                          <td className="px-4 py-2.5 text-[11px] text-sp-admin-muted">—</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] font-bold" style={{ color: statusColors[c.status] ?? '#888' }}>
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] font-semibold tabular-nums text-sp-admin-text">
                            {formatMoney(c.amountTalent)}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] font-bold tabular-nums" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                            {formatMoney(String(margin))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Facturación */}
          <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40 flex items-center justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Facturación</h2>
              <span className="text-[10px] text-sp-admin-muted">{invoices.length} registros</span>
            </div>
            {invoices.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-sp-admin-muted text-center">Sin movimientos de facturación</p>
            ) : (
              <div className="divide-y divide-sp-admin-border/40 max-h-64 overflow-y-auto">
                {invoices.slice(0, 8).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-sp-admin-text truncate">{inv.concept}</p>
                      <p className="text-[10px] text-sp-admin-muted">{new Date(inv.issueDate).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-[12px] font-bold tabular-nums ${inv.kind === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {inv.kind === 'expense' ? '−' : '+'}{formatMoney(inv.totalAmount)}
                      </p>
                      <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">{inv.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {business?.internalNotes && (
            <section className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Notas internas</h2>
              </div>
              <p className="px-4 py-3 text-[13px] text-sp-admin-text leading-relaxed whitespace-pre-wrap">{business.internalNotes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, color, label, value, href }: {
  readonly icon: string; readonly color: string; readonly label: string;
  readonly value: string; readonly href?: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[12px] shrink-0" style={{ background: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-sp-admin-muted uppercase tracking-wide leading-none">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-sp-admin-accent hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-[12px] font-medium text-sp-admin-text truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
