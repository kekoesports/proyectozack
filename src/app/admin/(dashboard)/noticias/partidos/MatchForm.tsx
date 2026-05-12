'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { Match } from '@/lib/queries/matches';
import { FeaturedMatchCard } from '@/features/news/components/FeaturedMatchCard';
import type { FeaturedMatchMeta } from '@/features/news/components/FeaturedMatchCard';
import type { createMatchAction, updateMatchAction } from './actions';

const INPUT  = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors placeholder:text-sp-admin-muted/40';
const SELECT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors';
const LABEL  = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

type SaveAction = typeof createMatchAction | typeof updateMatchAction;

type Props = {
  readonly match?: Match;
  readonly action: SaveAction;
};

export function MatchForm({ match, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, { ok: false, error: '' });

  // Live preview state
  const [team1, setTeam1]           = useState(match?.team1 ?? '');
  const [team2, setTeam2]           = useState(match?.team2 ?? '');
  const [team1Logo, setTeam1Logo]   = useState(match?.team1Logo ?? '');
  const [team2Logo, setTeam2Logo]   = useState(match?.team2Logo ?? '');
  const [tournament, setTournament] = useState(match?.tournament ?? '');
  const [matchDate, setMatchDate]   = useState(match?.matchDate ?? '');
  const [matchTime, setMatchTime]   = useState(match?.matchTime ?? '');
  const [matchStatus, setMatchStatus] = useState<string>(match?.matchStatus ?? '');

  const previewMeta: FeaturedMatchMeta = {
    team1:       team1 || null,
    team2:       team2 || null,
    team1Logo:   team1Logo || null,
    team2Logo:   team2Logo || null,
    tournament:  tournament || null,
    matchDate:   matchDate || null,
    matchTime:   matchTime || null,
    matchStatus: (matchStatus as FeaturedMatchMeta['matchStatus']) || null,
    isActive:    true,
  };
  const hasPreview = !!(team1 && team2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

      {/* Formulario */}
      <form action={formAction} className="space-y-5">
        {match && <input type="hidden" name="id" value={match.id} />}

        {'error' in state && state.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-4">
          <h2 className="font-semibold text-sp-admin-text text-sm">Equipos *</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Equipo A</label>
              <input name="team1" value={team1} onChange={e => setTeam1(e.target.value)}
                required maxLength={100} placeholder="NAVI" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Equipo B</label>
              <input name="team2" value={team2} onChange={e => setTeam2(e.target.value)}
                required maxLength={100} placeholder="GamerLegion" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Logo Equipo A (URL)</label>
              <input name="team1Logo" value={team1Logo} onChange={e => setTeam1Logo(e.target.value)}
                type="url" maxLength={500} placeholder="https://..." className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Logo Equipo B (URL)</label>
              <input name="team2Logo" value={team2Logo} onChange={e => setTeam2Logo(e.target.value)}
                type="url" maxLength={500} placeholder="https://..." className={INPUT} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-4">
          <h2 className="font-semibold text-sp-admin-text text-sm">Detalles del partido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className={LABEL}>Torneo</label>
              <input name="tournament" value={tournament} onChange={e => setTournament(e.target.value)}
                maxLength={200} placeholder="IEM Atalanta 2026" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fecha</label>
              <input name="matchDate" type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Hora (local)</label>
              <input name="matchTime" type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Estado (override)</label>
              <select name="matchStatus" value={matchStatus} onChange={e => setMatchStatus(e.target.value)} className={SELECT}>
                <option value="">— Auto (por fecha) —</option>
                <option value="upcoming">PRÓXIMO</option>
                <option value="live">EN VIVO</option>
                <option value="finished">FINAL</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" name="isActive" value="on"
              defaultChecked={match ? match.isActive : true}
              className="w-4 h-4 accent-sp-orange rounded" />
            <span className="text-sm font-semibold text-sp-admin-text">Activo (visible si está destacado)</span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isPending}
            className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:bg-sp-admin-accent/90 transition-colors disabled:opacity-60">
            {isPending ? 'Guardando…' : match ? 'Guardar cambios' : 'Crear partido'}
          </button>
          <Link href="/admin/noticias/partidos"
            className="h-9 px-4 rounded-lg border border-sp-admin-border text-sm text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors flex items-center">
            Cancelar
          </Link>
        </div>
      </form>

      {/* Preview reactivo */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
          Preview en tiempo real
        </p>
        {hasPreview ? (
          <div className="w-full bg-[#070707] rounded-xl">
            <FeaturedMatchCard meta={previewMeta} />
          </div>
        ) : (
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-bg p-5 text-center">
            <p className="text-xs text-sp-admin-muted">Rellena los equipos para ver el preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
