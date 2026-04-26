'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import type { Talent } from '@/types';

type CreatorsSidebarProps = {
  readonly creators: readonly (Talent & { giveawayCount: number })[];
  readonly selected: number | null;
  readonly onSelectAction: (id: number | null) => void;
};

export function CreatorsSidebar({ creators, selected, onSelectAction }: CreatorsSidebarProps): React.JSX.Element {
  return (
    <>
      {/* Desktop — vertical column */}
      <aside className="hidden lg:block w-56 shrink-0">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.15em] text-white/50 mb-4 px-2">
          Creadores
        </h2>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectAction(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm font-semibold ${
              selected === null
                ? 'gw-creator-active text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-sp-grad flex items-center justify-center text-white text-[10px] font-black shrink-0">
              ALL
            </div>
            <span>Todos</span>
          </button>

          {creators.map((c) => (
            <div key={c.id} className="relative group/row flex items-center">
              <motion.button
                type="button"
                onClick={() => onSelectAction(c.id)}
                className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  selected === c.id
                    ? 'gw-creator-active text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10">
                  {c.photoUrl ? (
                    <Image src={c.photoUrl} alt={c.name} fill sizes="32px" className="object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/60"
                      style={{ background: `linear-gradient(135deg, ${c.gradientC1}, ${c.gradientC2})` }}
                    >
                      {c.initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide truncate">{c.name}</p>
                  <p className="text-[10px] text-white/30">
                    {c.giveawayCount} {c.giveawayCount === 1 ? 'sorteo' : 'sorteos'}
                  </p>
                </div>
              </motion.button>
              {/* Link to creator page */}
              <Link
                href={`/c/${c.slug}`}
                title={`Ver página de ${c.name}`}
                className="opacity-0 group-hover/row:opacity-100 transition-opacity px-1.5 text-white/25 hover:text-sp-orange text-xs"
              >
                ↗
              </Link>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile — horizontal rail */}
      <div className="lg:hidden w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Creadores
          </h2>
          {selected !== null && (
            <button
              type="button"
              onClick={() => onSelectAction(null)}
              className="text-[10px] font-bold uppercase tracking-wider text-sp-orange/70 hover:text-sp-orange"
            >
              Quitar filtro
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onSelectAction(null)}
            aria-pressed={selected === null}
            className={`shrink-0 flex flex-col items-center gap-1.5 w-16 transition-opacity ${
              selected === null ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full bg-sp-grad flex items-center justify-center text-white text-[10px] font-black transition-all ${
                selected === null ? 'ring-2 ring-sp-orange ring-offset-2 ring-offset-sp-black' : ''
              }`}
            >
              ALL
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 truncate w-full text-center">
              Todos
            </span>
          </button>

          {creators.map((c) => {
            const isActive = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectAction(isActive ? null : c.id)}
                aria-pressed={isActive}
                className={`shrink-0 flex flex-col items-center gap-1.5 w-16 transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <div
                  className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 transition-all ${
                    isActive ? 'ring-2 ring-sp-orange ring-offset-2 ring-offset-sp-black' : 'ring-1 ring-white/10'
                  }`}
                >
                  {c.photoUrl ? (
                    <Image src={c.photoUrl} alt={c.name} fill sizes="48px" className="object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[11px] font-black text-white/80"
                      style={{ background: `linear-gradient(135deg, ${c.gradientC1}, ${c.gradientC2})` }}
                    >
                      {c.initials}
                    </div>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider truncate w-full text-center ${
                    isActive ? 'text-white' : 'text-white/60'
                  }`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
