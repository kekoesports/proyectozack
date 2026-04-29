import { requireRole } from '@/lib/auth-guard';
import { getBrandCampaigns, getBrandProposals } from '@/lib/queries/brands';
import { EmptyState } from '@/features/brand-portal/components/EmptyState';
import Link from 'next/link';

export default async function BrandDashboardPage() {
  const session = await requireRole('brand', '/marcas/login');
  const [campaigns, proposals] = await Promise.all([
    getBrandCampaigns(session.user.id),
    getBrandProposals(session.user.id),
  ]);

  const pendingProposals = proposals.filter((p) => p.status === 'pendiente');

  return (
    <div>
      <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-2">
        Hola, {session.user.name}
      </h1>
      <p className="text-sm text-sp-muted mb-8">Bienvenido al Portal de Marcas de SocialPro</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Campanas', value: campaigns.length },
          { label: 'Talentos', value: new Set(campaigns.map((c) => c.talentId)).size },
          { label: 'Propuestas pendientes', value: pendingProposals.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl bg-white border border-sp-border p-6">
            <div className="font-display text-4xl font-black gradient-text">{value}</div>
            <div className="text-sm text-sp-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent campaigns */}
      <h2 className="font-display text-xl font-black uppercase text-sp-dark mb-4">Campanas recientes</h2>
      {campaigns.length === 0 ? (
        <EmptyState
          message="Aun no tienes campanas. Explora nuestro roster de talentos."
          actionLabel="Explorar talentos"
          actionHref="/marcas/talentos"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.slice(0, 4).map((campaign) => (
            <div key={campaign.id} className="rounded-2xl bg-white border border-sp-border p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="font-display text-lg font-black uppercase text-sp-dark">
                  {campaign.talent.name}
                </div>
              </div>
              {campaign.caseStudy && (
                <p className="text-sm text-sp-muted">{campaign.caseStudy.title}</p>
              )}
              <p className="text-xs text-sp-muted2 mt-2">
                {new Date(campaign.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick action */}
      <div className="mt-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/marcas/targets"
            className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white bg-sp-grad hover:opacity-90 transition-opacity"
          >
            Abrir targets
          </Link>
          <Link
            href="/marcas/talentos"
            className="inline-block px-8 py-3 rounded-full text-sm font-bold text-sp-dark border border-sp-border bg-white hover:bg-sp-off transition-colors"
          >
            Explorar talentos
          </Link>
        </div>
      </div>
    </div>
  );
}
