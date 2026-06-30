import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { needsVisibilityFilter } from '@/lib/permissions';
import { env } from '@/lib/env';
import { getTalentById } from '@/lib/queries/talents';
import { getTalentBusiness, getTalentVerticals } from '@/lib/queries/talentBusiness';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listInvoices } from '@/lib/queries/invoices';
import { getFlagImageUrl, countryFlagEmoji } from '@/lib/flag-images';
import { TALENT_VERTICAL_LABELS } from '@/lib/schemas/talentBusiness';
import { TalentPhotoUpload } from '@/features/admin/talents/components/TalentPhotoUpload';
import { getTalentLiveStatus, getFeaturedFallbackCount } from '@/lib/queries/live';
import { setFeaturedLiveAction, setFeaturedFallbackAction, setExcludeFromLiveAction } from '@/app/admin/(dashboard)/live/actions';
import { setTalentPublishedAction, archiveTalentAction, restoreTalentAction } from '@/app/admin/(dashboard)/talents/actions';
import { getAdminGiveawaysByTalent } from '@/lib/queries/giveaways';
import { getAdminCodesByTalent } from '@/lib/queries/creatorCodes';
import { listCrmBrandsForPicker, getBrandNamesByIds } from '@/lib/queries/crmBrands';
import { listTrackersByTalentId, getTrackerSubtypeCounts } from '@/lib/queries/deal-trackers';
import { TalentDetailTabs } from '@/features/admin/talents/components/TalentDetailTabs';
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
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ tab?: string }>;
}): Promise<React.ReactElement> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const talentId = Number(id);
  if (isNaN(talentId)) notFound();

  const session = await requirePermission('talentos', 'read');

  const isStaffRole = session.user.role === 'staff';
  const staffOpts   = isStaffRole
    ? { session: { userId: session.user.id, role: session.user.role as 'staff' } }
    : undefined;

  // Filtro IDOR: staff solo puede ver talentos con los que tiene campañas asignadas.
  if (needsVisibilityFilter(session.user.role)) {
    const visible = await listCampaigns({ filters: { talentId }, ...staffOpts });
    if (visible.length === 0) notFound();
  }

  const [talent, business, verticals, campaigns, invoices, liveStatus, fallbackCount, giveaways, codes, brandCatalog, trackers] = await Promise.all([
    getTalentById(talentId),
    getTalentBusiness(talentId),
    getTalentVerticals(talentId),
    listCampaigns({ filters: { talentId }, ...staffOpts }),
    listInvoices({ talentId, ...(isStaffRole ? { staffUserId: session.user.id } : {}) }),
    getTalentLiveStatus(talentId),
    getFeaturedFallbackCount(),
    getAdminGiveawaysByTalent(talentId),
    getAdminCodesByTalent(talentId),
    listCrmBrandsForPicker(),
    listTrackersByTalentId(talentId),
  ]);

  const trackerIds = trackers.map((t) => t.id);
  const trackerSubtypeCounts = await getTrackerSubtypeCounts(trackerIds);

  if (!talent) notFound();

  // Resolver nombres de marca para campañas (sin filtrar por status)
  const brandIds = [...new Set(campaigns.filter((c) => c.brandId != null).map((c) => c.brandId as number))];
  const brandMap = await getBrandNamesByIds(brandIds);

  const flagImg   = talent.creatorCountry ? getFlagImageUrl(talent.creatorCountry) : null;
  const flagEmoji = talent.creatorCountry ? countryFlagEmoji(talent.creatorCountry) : null;

  const activeCampaigns = campaigns.filter((c) => c.status === 'activa').length;
  const incomeTotal     = invoices.filter((i) => i.kind === 'income').reduce((s, i) => s + Number(i.totalAmount), 0);
  const expenseTotal    = invoices.filter((i) => i.kind === 'expense').reduce((s, i) => s + Number(i.totalAmount), 0);
  const marginTotal     = incomeTotal - expenseTotal;
  const activeCodes     = codes.length;
  const activeGiveaways = giveaways.filter((g) => !g.endsAt || new Date(g.endsAt) > new Date()).length;

  const defaultTab = sp.tab ?? 'resumen';

  return (
    <div className="space-y-4 max-w-[1200px]">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted">
        <Link href="/admin/talents" className="hover:text-sp-admin-accent transition-colors">Influencers</Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium">{talent.name}</span>
      </div>

      {/* ── Header compacto ───────────────────────────────────────────── */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-5 py-4">
        <div className="flex items-center gap-4 flex-wrap">

          {/* Foto */}
          <TalentPhotoUpload
            talentId={talent.id}
            talentName={talent.name}
            initials={talent.initials}
            gradientC1={talent.gradientC1}
            gradientC2={talent.gradientC2}
            photoUrl={talent.photoUrl ?? null}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-sp-admin-text">{talent.name}</h1>
              {talent.creatorCountry && (
                <span className="flex items-center gap-1.5">
                  {flagImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={flagImg} alt={talent.creatorCountry} className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <span>{flagEmoji}</span>
                  )}
                  <span className="text-[11px] text-sp-admin-muted">{talent.creatorCountry}</span>
                </span>
              )}
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                talent.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : talent.status === 'available'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {talent.status === 'active' ? 'Activo' : talent.status === 'available' ? 'Disponible' : 'Inactivo'}
              </span>
              <form action={setTalentPublishedAction.bind(null, talent.id, !talent.isPublished)}>
                <button
                  type="submit"
                  title={talent.isPublished ? 'Haz clic para despublicar' : 'Haz clic para publicar en la web'}
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold transition-opacity hover:opacity-70 ${
                    talent.isPublished
                      ? 'bg-violet-50 text-violet-700 border border-violet-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {talent.isPublished ? 'Público' : 'Interno'}
                </button>
              </form>
              {talent.isPublished && (
                <a
                  href={`${env.NEXT_PUBLIC_SITE_URL}/talentos/${talent.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver perfil público"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-800 hover:border-slate-400 transition-colors"
                >
                  /talentos/{talent.slug}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
              )}
              {!talent.photoUrl && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Sin foto
                </span>
              )}
            </div>

            {talent.game && <p className="text-[12px] text-sp-admin-muted mt-0.5">{talent.game}</p>}

            {(verticals as TalentVertical[]).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(verticals as TalentVertical[]).map((v) => (
                  <span key={v} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-sp-admin-hover border border-sp-admin-border text-sp-admin-muted">
                    {TALENT_VERTICAL_LABELS[v] ?? v}
                  </span>
                ))}
              </div>
            )}

            {talent.socials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {talent.socials.map((s) => {
                  const key   = s.platform.toLowerCase();
                  const color = PLATFORM_COLOR[key] ?? '#888';
                  const label = PLATFORM_LABEL[key] ?? s.platform;
                  return (
                    <a key={s.id} href={s.profileUrl ?? '#'} target={s.profileUrl ? '_blank' : '_self'} rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-white hover:opacity-85 transition-opacity"
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

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href={`/admin/talents/${talent.id}/edit`}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent/10 border border-sp-admin-accent/30 text-[12px] font-semibold text-sp-admin-accent hover:bg-sp-admin-accent/20 transition-colors">
              ✎ Editar
            </Link>
            <Link href="/admin/campanas"
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors">
              + Campaña
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Campañas',        value: campaigns.length,         color: '#f5632a' },
          { label: 'Activas',         value: activeCampaigns,          color: '#16a34a' },
          { label: 'Revenue',         value: formatMoney(incomeTotal), color: '#8b3aad' },
          { label: 'Margen',          value: formatMoney(marginTotal), color: marginTotal >= 0 ? '#16a34a' : '#ef4444' },
          { label: 'Códigos',         value: activeCodes,              color: '#5b9bd5' },
          { label: 'Sorteos activos', value: activeGiveaways,          color: '#f59e0b' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: k.color }} />
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted leading-none">{k.label}</p>
              <p className="text-base font-bold mt-0.5 tabular-nums leading-tight" style={{ color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <TalentDetailTabs
        talent={talent}
        business={business}
        campaigns={campaigns}
        invoices={invoices}
        liveStatus={liveStatus}
        fallbackCount={fallbackCount}
        giveaways={giveaways}
        codes={codes}
        brandCatalog={brandCatalog}
        brandMap={brandMap}
        trackers={trackers}
        trackerSubtypeCounts={trackerSubtypeCounts}
        defaultTab={defaultTab}
        isStaffRole={isStaffRole}
        isAdmin={session.user.role === 'admin'}
        setFeaturedLiveAction={setFeaturedLiveAction.bind(null, talent.id, !talent.featuredLive)}
        setFeaturedFallbackAction={setFeaturedFallbackAction.bind(null, talent.id, !talent.featuredFallback, fallbackCount)}
        setExcludeFromLiveAction={setExcludeFromLiveAction.bind(null, talent.id, !talent.excludeFromLive)}
        archiveAction={archiveTalentAction.bind(null, talent.id)}
        restoreAction={restoreTalentAction.bind(null, talent.id)}
      />
    </div>
  );
}
