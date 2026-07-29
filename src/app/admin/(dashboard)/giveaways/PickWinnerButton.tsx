'use client';

import { useState, useTransition } from 'react';
import { pickRaffleWinnerAction } from './actions';

export function PickWinnerButton({ giveawayId }: { readonly giveawayId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pickWinner(): void {
    setError(null);
    startTransition(async () => {
      const result = await pickRaffleWinnerAction(giveawayId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={pickWinner}
        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
      >
        {pending ? 'Eligiendo…' : 'Elegir ganador'}
      </button>
      {error ? <p className="mt-1 max-w-40 text-[10px] text-red-400">{error}</p> : null}
    </div>
  );
}
