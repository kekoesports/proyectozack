'use client';

import { useState, useTransition, type ReactElement } from 'react';
import { createStatsShareLink, revokeStatsShareLink } from '@/app/admin/(dashboard)/stats/stats-actions';

type ShareRow = {
  readonly id: number;
  readonly token: string;
  readonly createdAt: Date;
};

type Props = {
  readonly shares: ShareRow[];
  readonly siteUrl: string;
};

/**
 * Panel para crear y revocar share links públicos token-based de stats de un talent.
 * Genera URLs absolutas a partir de `siteUrl`.
 *
 * @kind client
 * @feature admin/stats
 * @route /admin/talents/[id]/stats
 */
export function ShareLinkPanel({ shares, siteUrl }: Props): ReactElement {
  const [activeShares, setActiveShares] = useState(shares);
  const [isPending, startTransition] = useTransition();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function handleCreate() {
    startTransition(async () => {
      const result = await createStatsShareLink();
      if (result) {
        setActiveShares((prev) => [
          ...prev,
          { id: result.id, token: result.token, createdAt: new Date() },
        ]);
      }
    });
  }

  function handleRevoke(id: number) {
    startTransition(async () => {
      await revokeStatsShareLink(id);
      setActiveShares((prev) => prev.filter((s) => s.id !== id));
    });
  }

  function copyLink(token: string) {
    const url = `${siteUrl}/stats/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="px-5 py-3 border-b border-sp-admin-border flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sp-admin-muted">
          Links compartibles
        </h2>
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="text-[11px] font-semibold text-sp-admin-accent hover:underline disabled:opacity-50"
        >
          + Generar link
        </button>
      </div>

      {activeShares.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-sp-admin-muted/60">
          Sin links activos
        </div>
      ) : (
        <div className="divide-y divide-sp-admin-border/60">
          {activeShares.map((share) => {
            const url = `${siteUrl}/stats/${share.token}`;
            const isCopied = copiedToken === share.token;
            return (
              <div key={share.id} className="px-5 py-3 flex items-center gap-3 hover:bg-sp-admin-hover transition-colors">
                <span className="flex-1 min-w-0 text-xs text-sp-admin-muted truncate font-mono">
                  {url}
                </span>
                <button
                  onClick={() => copyLink(share.token)}
                  className="text-[11px] font-semibold text-sp-admin-accent hover:underline shrink-0"
                >
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={() => handleRevoke(share.id)}
                  disabled={isPending}
                  className="text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline shrink-0 disabled:opacity-50"
                >
                  Revocar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
