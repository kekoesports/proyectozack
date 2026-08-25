'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  discoverYouTubeTargetsAction,
  importQualifiedYouTubeTargetsAction,
  type YouTubeQualification,
  type VerifiedGamblingMarket,
} from '@/app/admin/(dashboard)/targets/youtube-actions';

const MARKET_LABELS: Record<VerifiedGamblingMarket, string> = {
  ES: 'España',
  CO: 'Colombia',
  PE: 'Perú',
};

const numberFormat = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });

export function YouTubeTargetDiscovery(): React.ReactElement {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('CS2 español');
  const [market, setMarket] = useState<VerifiedGamblingMarket>('ES');
  const [windowDays, setWindowDays] = useState<60 | 90>(90);
  const [results, setResults] = useState<readonly YouTubeQualification[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const qualified = useMemo(() => results.filter((item) => item.isQualified), [results]);

  const search = (): void => {
    setMessage(null);
    setSelected(new Set());
    startTransition(async () => {
      const response = await discoverYouTubeTargetsAction({
        query,
        market,
        windowDays,
        minimumVideos: 8,
        minimumViews: 1_000,
        limit: 15,
      });
      setResults(response.candidates);
      setMessage(response.error);
    });
  };

  const importSelected = (): void => {
    const channels = results.filter((item) => selected.has(item.channelId) && item.isQualified);
    if (channels.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const response = await importQualifiedYouTubeTargetsAction(channels);
      if (response.error) setMessage(response.error);
      else {
        setMessage(`${response.imported} canales nuevos y ${response.updated} actualizados en Creadores Target.`);
        setSelected(new Set());
      }
    });
  };

  const toggle = (channelId: string): void => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-sp-admin-hover"
      >
        <span>
          <span className="block text-sm font-bold text-sp-admin-text">Descubrir canales de CS2 en YouTube</span>
          <span className="mt-1 block text-xs text-sp-admin-muted">
            Verifica 8 vídeos recientes, 1.000 vistas mínimas por vídeo, idioma y mercado permitido.
          </span>
        </span>
        <span className="text-xs font-semibold text-red-400">{open ? 'Ocultar' : 'Abrir buscador'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-sp-admin-border p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Búsqueda</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') search(); }}
                className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2.5 text-sm text-sp-admin-text"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Mercado verificado</span>
              <select
                value={market}
                onChange={(event) => setMarket(event.target.value as VerifiedGamblingMarket)}
                className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2.5 text-sm text-sp-admin-text"
              >
                {Object.entries(MARKET_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Actividad</span>
              <select
                value={windowDays}
                onChange={(event) => setWindowDays(Number(event.target.value) as 60 | 90)}
                className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2.5 text-sm text-sp-admin-text"
              >
                <option value={60}>Últimos 2 meses</option>
                <option value={90}>Últimos 3 meses</option>
              </select>
            </label>
            <button
              type="button"
              onClick={search}
              disabled={isPending || query.trim().length < 2}
              className="self-end rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {isPending ? 'Revisando…' : 'Buscar y verificar'}
            </button>
          </div>

          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
            Solo se importan aprobados. Un canal sin país declarado se mantiene para revisión manual, nunca se da por permitido.
          </p>

          {message && <p className="text-sm text-sp-admin-muted">{message}</p>}

          {results.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-sp-admin-muted">
                  {qualified.length} aprobados de {results.length} revisados
                </p>
                <button
                  type="button"
                  onClick={importSelected}
                  disabled={isPending || selected.size === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  Añadir {selected.size} al CRM
                </button>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {results.map((channel) => (
                  <article
                    key={channel.channelId}
                    className={`rounded-xl border p-4 ${channel.isQualified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-sp-admin-border bg-sp-admin-bg/40'}`}
                  >
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${channel.title}`}
                        checked={selected.has(channel.channelId)}
                        disabled={!channel.isQualified}
                        onChange={() => toggle(channel.channelId)}
                        className="mt-1 accent-emerald-500"
                      />
                      {channel.thumbnailUrl ? (
                        <Image src={channel.thumbnailUrl} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover" />
                      ) : <div className="h-11 w-11 rounded-full bg-sp-admin-hover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`https://www.youtube.com/channel/${channel.channelId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-bold text-sp-admin-text hover:text-red-400"
                          >
                            {channel.title}
                          </a>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${channel.isQualified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                            {channel.isQualified ? 'APROBADO' : 'REVISAR'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-sp-admin-muted">
                          {MARKET_LABELS[channel.country as VerifiedGamblingMarket] ?? channel.country ?? 'País desconocido'} · {numberFormat.format(channel.subscriberCount)} suscriptores
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <Metric label="Vídeos" value={`${channel.videoCount}/${channel.windowDays}d`} pass={channel.videoCount >= 8} />
                          <Metric label="Mínimo" value={numberFormat.format(channel.minViews)} pass={channel.minViews >= 1_000} />
                          <Metric label="Media" value={numberFormat.format(channel.avgViews)} pass={channel.avgViews >= 1_000} />
                        </div>
                        {!channel.isQualified && (
                          <p className="mt-2 text-[11px] text-amber-300/80">{channel.reasons.join(' · ')}</p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, pass }: { label: string; value: string; pass: boolean }): React.ReactElement {
  return (
    <span className="rounded-md bg-black/10 px-2 py-1.5">
      <span className="block text-[9px] uppercase text-sp-admin-muted">{label}</span>
      <span className={pass ? 'font-semibold text-emerald-300' : 'font-semibold text-amber-300'}>{value}</span>
    </span>
  );
}
