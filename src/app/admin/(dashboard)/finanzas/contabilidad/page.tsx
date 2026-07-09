import { Landmark } from 'lucide-react';
import { requirePermission } from '@/lib/permissions';
import { loadSampleLedger } from '@/features/libro-mayor/__fixtures__/load-sample';
import { calculateKpis } from '@/features/libro-mayor/normalizer/kpis';
import { calculateAlerts } from '@/features/libro-mayor/normalizer/alerts';
import { LedgerBanner } from '@/features/libro-mayor/components/LedgerBanner';
import { LedgerSummary } from '@/features/libro-mayor/components/LedgerSummary';
import { LedgerAlerts } from '@/features/libro-mayor/components/LedgerAlerts';
import { AccountsTable } from '@/features/libro-mayor/components/AccountsTable';
import { MovementsTable } from '@/features/libro-mayor/components/MovementsTable';

export const metadata = { title: 'Contabilidad · Finanzas' };

/**
 * PR 1 — Contabilidad read-only desde Libro Mayor.
 *
 * Fuente de datos: fixture sintético en
 * `src/features/libro-mayor/__fixtures__/sample-ledger.json`.
 *
 * NUNCA lee el LM real. No hay DB, no hay migración, no hay upload.
 * Acceso: solo `admin` + `admin_limited_tasks` (módulo `contabilidad`).
 */
export default async function ContabilidadPage(): Promise<React.ReactElement> {
  await requirePermission('contabilidad', 'read');

  const report = loadSampleLedger();
  const kpis = calculateKpis(report);
  const alerts = calculateAlerts(report, kpis);

  return (
    <div className="space-y-6 pt-2">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-sp-admin-fg">
          <Landmark className="h-5 w-5 text-sp-orange" aria-hidden />
          Contabilidad (solo lectura)
        </h1>
        <p className="text-sm text-sp-admin-muted">
          Vista del Libro Mayor con conciliación diferida contra el CRM. Verificación, no reemplazo.
        </p>
      </header>

      <LedgerBanner />

      <LedgerSummary metadata={report.metadata} kpis={kpis} />

      <LedgerAlerts alerts={alerts} />

      <AccountsTable accounts={report.accounts} />

      <MovementsTable accounts={report.accounts} />
    </div>
  );
}
