import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAdminRedemptions } from '@/lib/queries/adminRedemptions';
import { cancelRedemptionAction, markRedemptionSentAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function RedemptionsAdminPage() {
  await requirePermission('sorteos', 'read');
  const rows = await getAdminRedemptions();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/giveaways" className="text-xs text-sp-admin-muted hover:text-sp-admin-text">
          ← Sorteos
        </Link>
        <h1 className="mt-2 font-display text-4xl font-black uppercase text-sp-admin-text">
          Canjes
        </h1>
        <p className="text-sm text-sp-admin-muted">
          Entrega, cancela y compensa solicitudes desde una única cola auditable.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-sp-admin-border text-left text-xs uppercase text-sp-admin-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Premio</th>
              <th className="px-4 py-3">Entrega</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Operación</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-sp-admin-border/60 align-top">
                <td className="px-4 py-3 text-sp-admin-muted">
                  {row.createdAt.toLocaleString('es-ES')}
                </td>
                <td className="px-4 py-3 text-sp-admin-text">
                  <div>{row.user.name}</div>
                  <div className="text-xs text-sp-admin-muted">{row.user.email}</div>
                </td>
                <td className="px-4 py-3 text-sp-admin-text">
                  {row.shopItem.name}
                  <div className="text-xs text-sp-admin-muted">{row.costCoins} puntos</div>
                </td>
                <td className="max-w-64 break-all px-4 py-3 text-sp-admin-muted">
                  {row.deliveryInfo ?? 'Sin datos'}
                </td>
                <td className="px-4 py-3 font-semibold text-sp-admin-text">{row.status}</td>
                <td className="px-4 py-3">
                  {row.status === 'pendiente' ? (
                    <form className="space-y-2">
                      <input type="hidden" name="redemptionId" value={row.id} />
                      <input
                        name="notes"
                        maxLength={2_000}
                        placeholder="Nota operativa"
                        className="w-52 rounded border border-sp-admin-border bg-sp-admin-bg px-2 py-1 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          formAction={markRedemptionSentAction}
                          className="rounded bg-emerald-700 px-2 py-1 text-xs font-bold text-white"
                        >
                          Marcar enviado
                        </button>
                        <button
                          formAction={cancelRedemptionAction}
                          className="rounded bg-red-800 px-2 py-1 text-xs font-bold text-white"
                        >
                          Cancelar y devolver
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="max-w-52 text-xs text-sp-admin-muted">
                      {row.adminNotes ?? 'Sin nota'}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sp-admin-muted">
                  No hay canjes.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
