'use client';

import { useState, useTransition } from 'react';
import { participateInGiveaway } from '@/app/sorteos/plataforma/actions';

interface Props {
  giveawayId: number;
  initialEntered: boolean;
}

/**
 * Botón de participación con estado optimista.
 * NOTA DISEÑO: sustituir clases por los tokens/estilos de SocialPro
 * (ver src/app/globals.css @theme y src/components/ui/button.tsx).
 */
export function EntryButton({ giveawayId, initialEntered }: Props) {
  const [entered, setEntered] = useState(initialEntered);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await participateInGiveaway({ giveawayId });
      if (result.ok) {
        setEntered(true);
      } else {
        setError(result.error);
        if (result.error.includes('Ya estás inscrito')) setEntered(true);
      }
    });
  }

  if (entered) {
    return (
      <button
        disabled
        className="w-full rounded-lg bg-emerald-600/20 px-4 py-2.5 text-sm font-semibold text-emerald-400"
      >
        ✔ Inscrito
      </button>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Inscribiendo…' : 'Participa gratis'}
      </button>
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
