import { requirePermission } from '@/lib/permissions';
import Link from 'next/link';
import { getAllPressTargets, getPressDrafts } from '@/lib/queries/pressTargets';
import { PressTargetsTable } from '@/features/admin/pressTargets/components/PressTargetsTable';

export default async function AdminPressTargetsPage(): Promise<React.ReactElement> {
  await requirePermission('prensa_targets', 'read');
  const [items, drafts] = await Promise.all([getAllPressTargets(), getPressDrafts()]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4 mb-6">
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">
          Prensa y artículos
        </h1>
        <span className="text-xs text-sp-admin-muted tabular-nums">
          {items.length} {items.length === 1 ? 'medio' : 'medios'}
        </span>
      </div>

      <p className="text-sm text-sp-admin-muted -mt-3">
        Prepara historias de SocialPro y propuestas para medios. Guardar un borrador no lo envía ni lo publica. Cada medio decide si publica y si incluye enlace.
      </p>

      {drafts.length > 0 && (
        <section aria-label="Artículos de prensa preparados" className="space-y-3">
          <h2 className="text-lg font-bold text-sp-admin-text">Artículos preparados</h2>
          {drafts.map((draft) => (
            <article key={draft.id} className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-3">
              <span className="text-xs font-semibold text-amber-400">Borrador en el CRM</span>
              <h3 className="text-lg font-bold text-sp-admin-text">{draft.title}</h3>
              <p className="text-sm text-sp-admin-muted">{draft.excerpt}</p>
              <details className="text-sm text-sp-admin-text">
                <summary className="cursor-pointer font-semibold">Leer artículo completo</summary>
                <div className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{draft.bodyMd}</div>
              </details>
              <Link href={`/admin/noticias/${draft.id}/edit`} className="inline-block text-sm font-semibold text-sp-admin-accent hover:underline">Editar artículo</Link>
            </article>
          ))}
        </section>
      )}
      <PressTargetsTable items={items} />
    </div>
  );
}
