import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { createMatchAction } from '../actions';
import { MatchForm } from '../MatchForm';

export default async function NewPartidoPage() {
  await requirePermission('noticias', 'publish');
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-sp-admin-muted mb-5">
        <Link href="/admin/noticias" className="hover:text-sp-admin-text">Noticias</Link>
        <span>/</span>
        <Link href="/admin/noticias/partidos" className="hover:text-sp-admin-text">Partidos</Link>
        <span>/</span>
        <span>Nuevo</span>
      </div>
      <h1 className="font-display text-2xl font-black uppercase text-sp-admin-text mb-6">Nuevo partido</h1>
      <MatchForm action={createMatchAction} />
    </div>
  );
}
