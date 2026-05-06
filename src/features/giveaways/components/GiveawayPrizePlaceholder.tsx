/**
 * Placeholder elegante para cuando imageUrl es null o la URL está rota.
 * Reemplaza el símbolo "?" en todas las cards de giveaway.
 */
export function GiveawayPrizePlaceholder({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }): React.ReactElement {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 52 : 40;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        {/* Caja inferior */}
        <rect x="6" y="22" width="36" height="20" rx="2" fill="currentColor" className="text-white/8" />
        <rect x="6" y="22" width="36" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
        {/* Tapa */}
        <rect x="4" y="16" width="40" height="8" rx="2" fill="currentColor" className="text-white/10" />
        <rect x="4" y="16" width="40" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-white/20" />
        {/* Lazo vertical */}
        <line x1="24" y1="16" x2="24" y2="42" stroke="currentColor" strokeWidth="2" className="text-white/25" />
        {/* Lazo horizontal */}
        <line x1="6" y1="20" x2="42" y2="20" stroke="currentColor" strokeWidth="2" className="text-white/25" />
        {/* Lazada izquierda */}
        <path
          d="M24 16 C24 10 17 7 14 10 C11 13 14 16 24 16"
          stroke="currentColor" strokeWidth="1.5" fill="none" className="text-white/20"
        />
        {/* Lazada derecha */}
        <path
          d="M24 16 C24 10 31 7 34 10 C37 13 34 16 24 16"
          stroke="currentColor" strokeWidth="1.5" fill="none" className="text-white/20"
        />
      </svg>
      <span className={`font-bold uppercase tracking-widest text-white/15 ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`}>
        Premio
      </span>
    </div>
  );
}
