'use client';

import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';

import {
  discoverTwitchTargetsAction,
  importTwitchTargetsAction,
  type TwitchDiscoveryCandidate,
} from '@/app/admin/(dashboard)/targets/discovery-actions';

const numberFormat = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });
const INPUT_CLASS = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2.5 text-sm text-sp-admin-text';

export function TwitchTargetDiscovery(): React.ReactElement {
  const [query, setQuery] = useState('Counter-Strike');
  const [language, setLanguage] = useState('any');
  const [minimumFollowers, setMinimumFollowers] = useState(1_000);
  const [results, setResults] = useState<readonly TwitchDiscoveryCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const qualified = useMemo(() => results.filter((candidate) => candidate.isQualified), [results]);

  const search = (): void => {
    setMessage(null);
    setSelected(new Set());
    startTransition(async () => {
      const response = await discoverTwitchTargetsAction({
        query,
        language,
        liveOnly: true,
        minimumFollowers,
      });
      setResults(response.candidates);
      setMessage(response.error);
    });
  };

  const importSelected = (): void => {
    const candidates = results.filter((candidate) => selected.has(candidate.broadcasterId) && candidate.isQualified);
    startTransition(async () => {
      const response = await importTwitchTargetsAction(candidates);
      setMessage(response.error ?? `${response.inserted} leads nuevos y ${response.updated} perfiles actualizados.`);
      if (!response.error) setSelected(new Set());
    });
  };

  const toggle = (id: string): void => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
        <Field label="Nombre del canal o creador">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Idioma">
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className={INPUT_CLASS}>
            <option value="any">Cualquier idioma</option>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
            <option value="de">Alemán</option>
            <option value="fr">Francés</option>
          </select>
        </Field>
        <Field label="Seguidores mínimos">
          <input type="number" min={100} value={minimumFollowers} onChange={(event) => setMinimumFollowers(Number(event.target.value))} className={INPUT_CLASS} />
        </Field>
        <button type="button" onClick={search} disabled={isPending || query.trim().length < 2} className="self-end rounded-lg bg-[#9146ff] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          {isPending ? 'Buscando…' : 'Buscar en Twitch'}
        </button>
      </div>

      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
        Twitch permite localizar canales activos, pero no devuelve el país. Los candidatos se guardan para revisión y nunca se aprueban legalmente de forma automática.
      </p>
      {message && <p className="text-xs text-sp-admin-muted">{message}</p>}

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-sp-admin-muted">{qualified.length} compatibles de {results.length} revisados</p>
            <button type="button" onClick={importSelected} disabled={isPending || selected.size === 0} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
              Añadir {selected.size} al CRM
            </button>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {results.map((candidate) => (
              <article key={candidate.broadcasterId} className={`rounded-xl border p-4 ${candidate.isQualified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-sp-admin-border bg-sp-admin-bg/40'}`}>
                <div className="flex gap-3">
                  <input type="checkbox" checked={selected.has(candidate.broadcasterId)} disabled={!candidate.isQualified} onChange={() => toggle(candidate.broadcasterId)} className="mt-1 accent-emerald-500" />
                  {candidate.thumbnailUrl ? <Image src={candidate.thumbnailUrl} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover" /> : <div className="h-11 w-11 rounded-full bg-sp-admin-hover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`https://www.twitch.tv/${candidate.login}`} target="_blank" rel="noreferrer" className="font-bold text-sp-admin-text hover:text-[#a970ff]">{candidate.displayName}</a>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${candidate.isQualified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{candidate.isQualified ? 'CANDIDATO' : 'NO CUMPLE'}</span>
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-300">{candidate.score}/100</span>
                    </div>
                    <p className="mt-1 text-xs text-sp-admin-muted">{numberFormat.format(candidate.followerCount)} seguidores · {candidate.language.toUpperCase()} · {candidate.currentGame || 'Sin categoría'}</p>
                    <p className="mt-2 text-[11px] text-sp-admin-muted">{candidate.reasons.join(' · ')}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }): React.ReactElement {
  return <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">{label}</span>{children}</label>;
}
