import Link from 'next/link';

type Props = {
  name: string;
  initials: string;
  role: string;
  reviewedDate: string;
  href?: string;
  /** 'dark' para fondos oscuros (sp-black), 'light' para fondos blancos */
  variant?: 'dark' | 'light';
  className?: string;
};

export function AuthorByline({ name, initials, role, reviewedDate, href = '/nosotros', variant = 'dark', className }: Props) {
  const textMain  = variant === 'dark' ? 'text-white/70 hover:text-white' : 'text-sp-dark hover:text-sp-orange';
  const textSub   = variant === 'dark' ? 'text-white/35' : 'text-sp-muted';
  const border    = variant === 'dark' ? 'border-white/10' : 'border-sp-border';

  return (
    <div className={`flex items-center gap-3 pt-5 border-t ${border} ${className ?? ''}`}>
      <div className="w-8 h-8 rounded-full bg-sp-orange/20 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-black text-sp-orange">{initials}</span>
      </div>
      <div>
        <Link href={href} className={`text-sm font-semibold transition-colors ${textMain}`}>
          {name}
        </Link>
        <p className={`text-xs ${textSub}`}>{role} · Actualizado {reviewedDate}</p>
      </div>
    </div>
  );
}
