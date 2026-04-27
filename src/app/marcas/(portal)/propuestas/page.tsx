import { requireRole } from '@/lib/auth-guard';
import { getBrandProposals } from '@/lib/queries/brands';
import { EmptyState } from '@/features/brand-portal/components/EmptyState';
import Image from 'next/image';
import { gradientStyle } from '@/lib/utils/gradient';

const statusColors: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  en_revision: 'bg-blue-100 text-blue-700',
  aceptada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-600',
};

export default async function BrandProposalsPage() {
  const session = await requireRole('brand', '/marcas/login');
  const proposals = await getBrandProposals(session.user.id);

  return (
    <div>
      <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-6">Mis propuestas</h1>

      {proposals.length === 0 ? (
        <EmptyState
          message="No has enviado propuestas aun. Explora talentos y envia tu primera propuesta."
          actionLabel="Explorar talentos"
          actionHref="/marcas/talentos"
        />
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => {
            const grad = gradientStyle(proposal.talent.gradientC1, proposal.talent.gradientC2);
            return (
              <div key={proposal.id} className="rounded-2xl bg-white border border-sp-border p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden" style={{ background: grad }}>
                  {proposal.talent.photoUrl ? (
                    <Image src={proposal.talent.photoUrl} alt={proposal.talent.name} width={48} height={48} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-sm font-black text-white">{proposal.talent.initials}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-black uppercase text-sp-dark">{proposal.talent.name}</div>
                  <p className="text-xs text-sp-muted truncate">{proposal.campaignType} · {proposal.budgetRange} · {proposal.timeline}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[proposal.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {proposal.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-sp-muted2">{new Date(proposal.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
