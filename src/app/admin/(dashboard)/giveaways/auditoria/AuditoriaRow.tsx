import { redactAuditMetadata, summarizeUserAgent, truncateIpHash } from '@/lib/audit/redactMetadata';
import type { AuditEventRow } from '@/lib/queries/giveawayAudit';

interface Props {
  readonly row: AuditEventRow;
}

export function AuditoriaRow({ row }: Props): React.ReactElement {
  const { visible, hiddenCount } = redactAuditMetadata(row.metadata);
  const outcomeClass =
    row.outcome === 'success' ? 'bg-emerald-500/15 text-emerald-300' :
    row.outcome === 'blocked' ? 'bg-red-500/15 text-red-300' :
    row.outcome === 'error' ? 'bg-orange-500/15 text-orange-300' :
    row.outcome === 'rate_limited' ? 'bg-yellow-500/15 text-yellow-300' :
    row.outcome === 'unauthorized' ? 'bg-purple-500/15 text-purple-300' :
    'bg-white/10 text-white/60';

  return (
    <tr className="border-b border-white/5 align-top">
      <td className="whitespace-nowrap px-3 py-2 text-xs text-white/70">
        {row.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
      </td>
      <td className="px-3 py-2 text-xs">
        <code>{row.action}</code>
      </td>
      <td className="px-3 py-2 text-xs">
        <span className={`inline-block rounded px-2 py-0.5 ${outcomeClass}`}>{row.outcome}</span>
      </td>
      <td className="px-3 py-2 text-xs">
        {row.userId ? (
          <div className="flex flex-col">
            <span className="text-white">{row.userName ?? '(sin nombre)'}</span>
            <code className="text-[10px] text-white/40">{row.userId.slice(0, 12)}</code>
          </div>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs">
        {row.refType || row.refId ? (
          <code className="text-white/70">{row.refType ?? '?'}#{row.refId ?? '?'}</code>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-white/60">
        {row.country ?? '—'}
      </td>
      <td className="px-3 py-2 text-xs" title="Solo primeros 12 caracteres del hash SHA-256">
        <code className="text-white/50">{truncateIpHash(row.ipHash)}</code>
      </td>
      <td className="px-3 py-2 text-xs text-white/60" title={row.userAgent ?? ''}>
        {summarizeUserAgent(row.userAgent)}
      </td>
      <td className="px-3 py-2 text-xs">
        {Object.keys(visible).length === 0 && hiddenCount === 0 ? (
          <span className="text-white/40">—</span>
        ) : (
          <details>
            <summary className="cursor-pointer text-white/60 hover:text-white">
              ver {Object.keys(visible).length} campo(s){hiddenCount > 0 ? ` +${hiddenCount} ocultos` : ''}
            </summary>
            <pre className="mt-2 max-w-md overflow-x-auto rounded bg-black/40 p-2 text-[11px] text-white/70">{JSON.stringify(visible, null, 2)}</pre>
          </details>
        )}
      </td>
    </tr>
  );
}
