'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LiveBarItem, LiveBarAccent } from './types';

const ROTATE_MS = 4500;

const ACCENT_DOT: Record<LiveBarAccent, string> = {
  red: 'bg-red-500',
  emerald: 'bg-emerald-400',
  orange: 'bg-sp-orange',
  pink: 'bg-sp-pink',
  purple: 'bg-sp-purple',
  blue: 'bg-sp-blue',
};

const ACCENT_LABEL: Record<LiveBarAccent, string> = {
  red: 'text-red-300',
  emerald: 'text-emerald-300',
  orange: 'text-sp-orange',
  pink: 'text-sp-pink',
  purple: 'text-sp-purple',
  blue: 'text-sp-blue',
};

type Props = {
  readonly items: readonly LiveBarItem[];
};

/**
 * Strip rotativo arriba del hub /news. Server pre-carga todos los items;
 * cliente alterna el visible cada 4.5s con cross-fade. Sin re-fetches.
 *
 * @kind client
 * @feature news/live-bar
 */
export function LiveBar({ items }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Subscripción real a setInterval — necesaria para rotación temporal
    // de UI fuera del modelo declarativo de React.
    if (items.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [items.length, paused]);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Actualidad live SocialPro News"
      className="relative bg-sp-black border-b border-white/[0.05]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="relative h-11 md:h-12 overflow-hidden">
          {items.map((item, i) => {
            const active = i === idx;
            const dotClass = ACCENT_DOT[item.accent];
            const labelClass = ACCENT_LABEL[item.accent];
            const isLive = item.kind === 'streams_live' || item.kind === 'matches_preview';
            return (
              <LiveBarRow
                key={`${item.kind}-${i}`}
                item={item}
                active={active}
                dotClass={dotClass}
                labelClass={labelClass}
                isLive={isLive}
              />
            );
          })}
        </div>

        {items.length > 1 ? (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px flex pointer-events-none"
          >
            {items.map((_, i) => (
              <span
                key={i}
                className={`flex-1 transition-colors duration-500 ${
                  i === idx ? 'bg-white/30' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type RowProps = {
  readonly item: LiveBarItem;
  readonly active: boolean;
  readonly dotClass: string;
  readonly labelClass: string;
  readonly isLive: boolean;
};

function LiveBarRow({ item, active, dotClass, labelClass, isLive }: RowProps) {
  const isBroadcast = item.kind === 'streams_live';
  const inner = (
    <div className="flex items-center gap-3 h-full w-full min-w-0">
      {isBroadcast ? (
        <span className="flex-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-red-300 bg-red-500/12 border border-red-500/40 rounded px-1.5 py-0.5 leading-none">
          <span aria-hidden className="relative flex-none w-1.5 h-1.5 rounded-full bg-red-500">
            <span aria-hidden className="absolute inset-0 rounded-full bg-red-500 motion-safe:animate-ping opacity-70" />
          </span>
          {item.label}
        </span>
      ) : (
        <>
          <span aria-hidden className={`relative flex-none w-2 h-2 rounded-full ${dotClass}`}>
            {isLive ? (
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full ${dotClass} motion-safe:animate-ping opacity-60`}
              />
            ) : null}
          </span>
          <span className={`flex-none text-[10px] font-bold uppercase tracking-[0.22em] ${labelClass}`}>
            {item.label}
          </span>
        </>
      )}
      <span aria-hidden className="hidden sm:inline text-white/15">·</span>
      <span className="flex-1 min-w-0 truncate text-[13px] md:text-sm font-medium text-white/85">
        {item.text}
      </span>
      {item.meta ? (
        <>
          <span aria-hidden className="hidden md:inline text-white/15">·</span>
          <span className="hidden md:inline flex-none text-[12px] text-white/45 truncate max-w-[300px]">
            {item.meta}
          </span>
        </>
      ) : null}
      {item.href ? (
        <span
          aria-hidden
          className="flex-none ml-1 text-white/40 group-hover:text-white/85 group-hover:translate-x-0.5 transition-all"
        >
          →
        </span>
      ) : null}
    </div>
  );

  const baseClasses = `absolute inset-0 flex items-center transition-opacity duration-500 ease-out ${
    active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
  }`;

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-hidden={!active}
        tabIndex={active ? 0 : -1}
        className={`group ${baseClasses}`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={baseClasses} aria-hidden={!active}>
      {inner}
    </div>
  );
}
