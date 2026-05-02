'use client';

import { useActionState } from 'react';
import { createWinnerAction, type WinnerActionState } from './winners-actions';

type Giveaway = { readonly id: number; readonly title: string; readonly talent: { readonly name: string } };

export function CreateWinnerForm({ giveaways }: { giveaways: readonly Giveaway[] }): React.ReactElement {
  const [state, formAction] = useActionState<WinnerActionState | null, FormData>(
    async (_prev, fd) => createWinnerAction(fd),
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Sorteo</label>
        <select name="giveawayId" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
          <option value="">Seleccionar...</option>
          {giveaways.map((g) => (
            <option key={g.id} value={g.id}>{g.title} ({g.talent.name})</option>
          ))}
        </select>
        {fieldErrors?.giveawayId && <p className="text-xs text-red-400 mt-1">{fieldErrors.giveawayId[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Nombre del ganador</label>
        <input name="winnerName" required maxLength={100} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.winnerName && <p className="text-xs text-red-400 mt-1">{fieldErrors.winnerName[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Avatar (URL)</label>
        <input name="winnerAvatar" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.winnerAvatar && <p className="text-xs text-red-400 mt-1">{fieldErrors.winnerAvatar[0]}</p>}
      </div>
      <div className="md:col-span-3">
        <button type="submit" className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity">
          Registrar Ganador
        </button>
      </div>
    </form>
  );
}
