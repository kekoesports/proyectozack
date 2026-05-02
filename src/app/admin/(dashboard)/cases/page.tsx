import { requireAnyRole } from '@/lib/auth-guard';
import { getCaseStudies } from '@/lib/queries/cases';
import { deleteCaseAction } from './actions';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';

export default async function AdminCasesPage(): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const cases = await getCaseStudies();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Casos de éxito"
        stats={[{ label: 'publicados', value: cases.length, accent: '#f5632a' }]}
      />

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-sm font-medium text-sp-admin-muted">No hay casos de éxito todavía.</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">Los casos se crean desde la ficha de cada campaña.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {cases.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-3 hover:bg-sp-admin-hover transition-colors ${
                i < cases.length - 1 ? 'border-b border-sp-admin-border/50' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}
                >
                  {c.brandName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-sp-admin-text truncate">{c.brandName}</p>
                  <p className="text-[11px] text-sp-admin-muted truncate max-w-md">{c.title}</p>
                </div>
              </div>
              <form action={deleteCaseAction}>
                <input type="hidden" name="id" value={c.id} />
                <DeleteButton name={`caso ${c.brandName}`} />
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
