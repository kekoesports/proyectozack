'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Talent } from '@/types';

type Creator = Talent & { giveawayCount: number; codeCount: number };

type CreatorsSidebarProps = {
  readonly creators: readonly Creator[];
  readonly selected: number | null;
  readonly onSelectAction: (id: number | null) => void;
};

export function CreatorsSidebar({ creators, selected, onSelectAction }: CreatorsSidebarProps): React.JSX.Element {
  return (
    <>
      {/* ── Desktop: vertical sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-3 px-1">
          Creadores
        </h2>

        <div className="space-y-1">
          {/* All */}
          <button
            type="button"
            onClick={() => onSelectAction(null)}
            className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all border-l-2 ${
              selected === null
                ? 'border-sp-orange bg-sp-orange/[0.08] shadow-[inset_4px_0_12px_rgba(245,99,42,0.04)]'
                : 'border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}
            >
              ALL
            </div>
            <div className="text-left min-w-0">
              <p className={`text-xs font-black uppercase tracking-wide ${selected === null ? 'text-white' : 'text-white/60'}`}>
                Todos
              </p>
              <p className="text-[10px] text-white/30 tabular-nums">
                {creators.reduce((s, c) => s + c.codeCount, 0)} códigos
              </p>
            </div>
          </button>

          {/* Creators */}
          {creators.map((c) => {
            const isActive = selected === c.id;
            return (
              <div key={c.id} className="relative group/row">
                <button
                  type="button"
                  onClick={() => onSelectAction(isActive ? null : c.id)}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all border-l-2 ${
                    isActive
                      ? 'border-sp-orange bg-sp-orange/[0.08] shadow-[inset_4px_0_12px_rgba(245,99,42,0.04)]'
                      : 'border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all"
                    style={{
                      boxShadow: isActive
                        ? '0 0 0 2px #f5632a, 0 0 10px rgba(245,99,42,0.3)'
                        : '0 0 0 1px rgba(255,255,255,0.07)',
                    }}
                  >
                    {c.photoUrl ? (
                      <Image src={c.photoUrl} alt={c.name} fill sizes="40px" className="object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-[10px] font-black text-white"
                        style={{ background: `linear-gradient(135deg, ${c.gradientC1}, ${c.gradientC2})` }}
                      >
                        {c.initials}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="text-left min-w-0 flex-1">
                    <p className={`text-xs font-black uppercase tracking-wide truncate transition-colors ${isActive ? 'text-white' : 'text-white/65'}`}>
                      {c.name}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5 tabular-nums">
                      {c.codeCount} {c.codeCount === 1 ? 'código' : 'códigos'}
                      {c.giveawayCount > 0 && ` · ${c.giveawayCount} ${c.giveawayCount === 1 ? 'sorteo' : 'sorteos'}`}
                    </p>
                  </div>
                </button>

                {/* Ver perfil — visible on hover */}
                <Link
                  href={`/c/${c.slug}`}
                  title={`Ver perfil de ${c.name}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] hover:bg-sp-orange/20 hover:text-sp-orange text-white/35 transition-all text-[11px]">
                    ↗
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Mobile: horizontal scroll ───────────────────────────────── */}
      <div className="lg:hidden w-full mb-4">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
            Creadores
          </h2>
          {selected !== null && (
            <button
              type="button"
              onClick={() => onSelectAction(null)}
              className="text-[10px] font-black uppercase tracking-wider text-sp-orange/70 hover:text-sp-orange"
            >
              × Quitar
            </button>
          )}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* All */}
          <button
            type="button"
            onClick={() => onSelectAction(null)}
            className={`shrink-0 flex flex-col items-center gap-1.5 w-[72px] transition-opacity ${selected === null ? 'opacity-100' : 'opacity-60'}`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-[10px] font-black transition-all ${
                selected === null ? 'ring-2 ring-sp-orange ring-offset-2 ring-offset-[#09090f]' : ''
              }`}
              style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)' }}
            >
              ALL
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/50 truncate w-full text-center">
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
                className={`shrink-0 flex flex-col items-center gap-1.5 w-[72px] transition-opacity ${isActive ? 'opacity-100' : 'opacity-65'}`}
              >
                <div
                  className={`relative w-12 h-12 rounded-full overflow-hidden transition-all ${
                    isActive ? 'ring-2 ring-sp-orange ring-offset-2 ring-offset-[#09090f]' : 'ring-1 ring-white/10'
                  }`}
                >
                  {c.photoUrl ? (
                    <Image src={c.photoUrl} alt={c.name} fill sizes="48px" className="object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-[11px] font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${c.gradientC1}, ${c.gradientC2})` }}
                    >
                      {c.initials}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${isActive ? 'text-white' : 'text-white/55'}`}>
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
