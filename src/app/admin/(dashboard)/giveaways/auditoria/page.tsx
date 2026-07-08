import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import {
  listAuditEvents,
  countAuditEventsByAction,
  AUDIT_DEFAULT_PAGE_SIZE,
} from '@/lib/queries/giveawayAudit';
import { AUDIT_ACTIONS, AUDIT_OUTCOMES } from '@/db/schema/giveawayAuditEvents';
import { parseAuditSearch, decodeCursor } from '@/lib/schemas/giveawayAudit';
import { AuditoriaFilters } from './AuditoriaFilters';
import { AuditoriaRow } from './AuditoriaRow';

export const dynamic = 'force-dynamic';

interface Search {
  from?: string;
  to?: string;
  action?: string;
  outcome?: string;
  userId?: string;
  refType?: string;
  country?: string;
  cursor?: string;
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<React.ReactElement> {
  await requirePermission('sorteos', 'audit');

  const raw = await searchParams;
  const filters = parseAuditSearch({ ...raw });
  const cursor = decodeCursor(raw.cursor);

  const [{ rows, nextCursor }, byAction] = await Promise.all([
    listAuditEvents({
      from: filters.from ?? null,
      to: filters.to ?? null,
      action: filters.action ?? null,
      outcome: filters.outcome ?? null,
      userId: filters.userId ?? null,
      refType: filters.refType ?? null,
      country: filters.country ?? null,
      cursor,
      pageSize: AUDIT_DEFAULT_PAGE_SIZE,
    }),
    countAuditEventsByAction({ from: filters.from ?? null, to: filters.to ?? null }),
  ]);

  const nextHref = buildNextHref(raw, nextCursor);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-white">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-tight">Auditoría de Sorteos</h1>
          <p className="mt-1 text-sm text-white/60">
            Eventos registrados en <code>sp_audit_events</code>. Sin PII directa: IP hasheada, sin emails.
          </p>
        </div>
        <Link
          href="/admin/giveaways"
          className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          ← Volver a Sorteos
        </Link>
      </header>

      <section className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
          Conteo por acción {filters.from || filters.to ? '(rango filtrado)' : '(sin filtro de fecha)'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {AUDIT_ACTIONS.map((a) => (
            <span key={a} className="inline-flex items-baseline gap-2 rounded-md bg-white/5 px-3 py-1.5 text-xs">
              <span className="text-white/50">{a}</span>
              <span className="font-mono text-white">{byAction[a] ?? 0}</span>
            </span>
          ))}
        </div>
      </section>

      <AuditoriaFilters
        initial={cleanInitial(raw)}
        actionOptions={[...AUDIT_ACTIONS]}
        outcomeOptions={[...AUDIT_OUTCOMES]}
      />

      <section className="mt-6 rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/50">
            Sin eventos para los filtros seleccionados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-white/50">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Ref</th>
                <th className="px-3 py-2">País</th>
                <th className="px-3 py-2">IP hash</th>
                <th className="px-3 py-2">User-Agent</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <AuditoriaRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {nextHref && (
        <nav className="mt-4 flex justify-end">
          <Link
            href={nextHref}
            className="rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Siguiente página →
          </Link>
        </nav>
      )}

      <p className="mt-8 text-xs text-white/40">
        Retención: la política actual está en <code>docs/legal/audit-retention.md</code>. Los eventos no se borran automáticamente.
      </p>
    </div>
  );
}

function cleanInitial(raw: Search): { from?: string; to?: string; action?: string; outcome?: string; userId?: string; refType?: string; country?: string } {
  const out: { from?: string; to?: string; action?: string; outcome?: string; userId?: string; refType?: string; country?: string } = {};
  if (raw.from) out.from = raw.from;
  if (raw.to) out.to = raw.to;
  if (raw.action) out.action = raw.action;
  if (raw.outcome) out.outcome = raw.outcome;
  if (raw.userId) out.userId = raw.userId;
  if (raw.refType) out.refType = raw.refType;
  if (raw.country) out.country = raw.country;
  return out;
}

function encodeCursor(cursor: { createdAt: string; id: number }): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function buildNextHref(current: Search, next: { createdAt: string; id: number } | null): string | null {
  if (!next) return null;
  const params = new URLSearchParams();
  if (current.from) params.set('from', current.from);
  if (current.to) params.set('to', current.to);
  if (current.action) params.set('action', current.action);
  if (current.outcome) params.set('outcome', current.outcome);
  if (current.userId) params.set('userId', current.userId);
  if (current.refType) params.set('refType', current.refType);
  if (current.country) params.set('country', current.country);
  params.set('cursor', encodeCursor(next));
  return `/admin/giveaways/auditoria?${params.toString()}`;
}
