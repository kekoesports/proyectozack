import Link from 'next/link';

interface PlaceholderSectionProps {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly bullets?: readonly string[];
  readonly relatedLinks?: readonly { readonly href: string; readonly label: string }[];
}

/**
 * Bloque neutro "Próximamente" para las secciones del rediseño de
 * Finanzas que todavía no tienen implementación completa. Preserva la
 * navegación sin fingir features que no existen.
 *
 * Uso: cada `page.tsx` de las tabs canónicas nuevas hasta que se
 * desarrollen en PRs posteriores.
 */
export function PlaceholderSection({
  title,
  subtitle,
  icon,
  bullets,
  relatedLinks,
}: PlaceholderSectionProps): React.ReactElement {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <h1 className="text-xl font-bold text-sp-admin-fg">{title}</h1>
        <p className="text-sm text-sp-admin-muted">{subtitle}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-sp-border bg-sp-admin-card/60 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl leading-none shrink-0">{icon}</div>
          <div className="space-y-3 min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide border border-amber-500/25">
              Próximamente
            </div>
            <p className="text-sm text-sp-admin-fg">
              Esta sección está aprobada dentro del rediseño de Finanzas pero aún no tiene desarrollo
              completo. Aparece en la navegación para que quede clara la estructura definitiva.
            </p>
            {bullets && bullets.length > 0 ? (
              <ul className="text-xs text-sp-admin-muted list-disc list-inside space-y-1 pt-1">
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            {relatedLinks && relatedLinks.length > 0 ? (
              <div className="pt-2 space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-sp-admin-muted">
                  Mientras tanto puedes usar
                </p>
                <div className="flex flex-wrap gap-2">
                  {relatedLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="inline-flex items-center gap-1 rounded-full border border-sp-border bg-sp-admin-card px-3 py-1 text-[11px] font-medium text-sp-admin-fg hover:border-sp-orange/50 hover:text-sp-orange transition-colors"
                    >
                      {l.label} →
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
