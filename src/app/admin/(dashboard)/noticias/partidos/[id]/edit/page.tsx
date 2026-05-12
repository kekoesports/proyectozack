import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getMatchById } from '@/lib/queries/matches';
import { updateMatchAction } from '../../actions';
import { MatchForm } from '../../MatchForm';

export default async function EditPartidoPage({ params }: { readonly params: Promise<{ id: string }> }) {
  await requirePermission('noticias', 'publish');
  const { id } = await params;
  const match = await getMatchById(Number(id));
  if (!match) notFound();
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-sp-admin-muted mb-5">
        <Link href="/admin/noticias" className="hover:text-sp-admin-text">Noticias</Link>
        <span>/</span>
        <Link href="/admin/noticias/partidos" className="hover:text-sp-admin-text">Partidos</Link>
        <span>/</span>
        <span>Editar</span>
      </div>
      <h1 className="font-display text-2xl font-black uppercase text-sp-admin-text mb-1">
        {match.team1} vs {match.team2}
      </h1>
      <p className="text-sm text-sp-admin-muted mb-6">{match.tournament}</p>
      <MatchForm match={match} action={updateMatchAction} />
    </div>
  );
}
