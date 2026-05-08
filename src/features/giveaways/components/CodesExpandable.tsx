'use client';

import { useState } from 'react';
import { CodeRowMini } from './CodeRowMini';
import type { CreatorCodeWithTalent } from '@/types';

const DEFAULT_VISIBLE = 4;

type Props = {
  readonly codes: readonly CreatorCodeWithTalent[];
  readonly label: string;
};

/**
 * Lista expandible de códigos secundarios.
 * Muestra DEFAULT_VISIBLE por defecto y permite ver el resto.
 */
export function CodesExpandable({ codes, label }: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const visible   = expanded ? codes : codes.slice(0, DEFAULT_VISIBLE);
  const remaining = codes.length - DEFAULT_VISIBLE;

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{label}</h2>
        <span className="text-[10px] text-white/20 tabular-nums">{codes.length} activos</span>
      </div>

      <div className="space-y-1.5">
        {visible.map((c) => <CodeRowMini key={c.id} code={c} />)}
      </div>

      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full py-2 rounded-xl border border-dashed border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/30 hover:text-white/50 hover:border-white/20 transition-colors cursor-pointer"
        >
          Ver {remaining} más ▾
        </button>
      )}

      {expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 w-full py-2 rounded-xl border border-dashed border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/20 hover:text-white/40 transition-colors cursor-pointer"
        >
          Ocultar ▴
        </button>
      )}
    </div>
  );
}
