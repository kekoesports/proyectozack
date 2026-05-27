'use client';

import { DeleteConfirmButton } from './DeleteConfirmButton';
import { deleteWinnerAction } from './winners-actions';
import type { GiveawayWinnerWithGiveaway } from '@/types';

type Props = {
  readonly winners: readonly GiveawayWinnerWithGiveaway[];
  readonly onRegisterWinner: () => void;
};

export function WinnersTab({ winners, onRegisterWinner }: Props): React.ReactElement {
  if (winners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 rounded-xl bg-sp-admin-card border border-sp-admin-border flex items-center justify-center text-sp-admin-muted">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6" aria-hidden>
            <path fillRule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 0 0-.629.74v.387c-.827.157-1.642.345-2.445.561a.75.75 0 0 0-.552.698 5 5 0 0 0 4.503 5.152 6 6 0 0 0 2.946 1.822A6.451 6.451 0 0 1 7.768 13H7.5A1.5 1.5 0 0 0 6 14.5V17h-.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H14v-2.5A1.5 1.5 0 0 0 12.5 13h-.268a6.453 6.453 0 0 1-.684-2.202 6 6 0 0 0 2.946-1.822 5 5 0 0 0 4.503-5.152.75.75 0 0 0-.552-.698A31.804 31.804 0 0 0 16 2.562v-.387a.75.75 0 0 0-.629-.74A33.227 33.227 0 0 0 10 1Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-sp-admin-muted">No hay ganadores registrados.</p>
        <button
          type="button"
          onClick={onRegisterWinner}
          className="px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Registrar ganador
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <div className="px-6 py-3 border-b border-sp-admin-border bg-sp-admin-bg/50 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wider">
          {winners.length} ganador{winners.length !== 1 ? 'es' : ''}
        </span>
        <button
          type="button"
          onClick={onRegisterWinner}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sp-admin-accent hover:opacity-70 transition-opacity"
        >
          + Registrar ganador
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
            <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Ganador</th>
            <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Sorteo</th>
            <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fecha</th>
            <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {winners.map((w) => (
            <tr
              key={w.id}
              className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors"
            >
              <td className="px-6 py-4 font-medium text-sp-admin-text">{w.winnerName}</td>
              <td className="px-6 py-4 text-sp-admin-muted">{w.giveaway.title}</td>
              <td className="px-6 py-4 text-sp-admin-muted">
                {new Date(w.wonAt).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="px-6 py-4">
                <DeleteConfirmButton
                  action={deleteWinnerAction}
                  fields={{ id: w.id }}
                  label={w.winnerName}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
