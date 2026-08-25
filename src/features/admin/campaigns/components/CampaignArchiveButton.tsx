'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  archiveCampaignAction,
  unarchiveCampaignAction,
} from '@/app/admin/(dashboard)/campanas/actions';

type Props = {
  readonly campaignId: number;
  readonly campaignName: string;
  readonly archived: boolean;
  readonly canArchive: boolean;
};

export function CampaignArchiveButton({
  campaignId,
  campaignName,
  archived,
  canArchive,
}: Props): React.ReactElement | null {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canArchive) return null;

  async function handleClick(): Promise<void> {
    const verb = archived ? 'restaurar' : 'archivar';
    if (!confirm(`¿Quieres ${verb} “${campaignName}”?`)) return;

    setError(null);
    setBusy(true);
    const result = archived
      ? await unarchiveCampaignAction(campaignId)
      : await archiveCampaignAction(campaignId);
    if (!result.success) {
      setError(result.error || `No se pudo ${verb} el trato.`);
      setBusy(false);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={busy || pending}
        onClick={(event) => {
          event.stopPropagation();
          void handleClick();
        }}
        className={[
          'text-[11px] transition-colors disabled:opacity-50',
          archived
            ? 'text-sp-admin-accent hover:underline'
            : 'text-sp-admin-muted hover:text-red-500',
        ].join(' ')}
      >
        {busy || pending ? 'Guardando…' : archived ? 'Restaurar' : 'Archivar'}
      </button>
      {error && <span className="max-w-[180px] text-[9px] text-red-500">{error}</span>}
    </span>
  );
}
