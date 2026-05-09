import Link from 'next/link';
import type { DetectedBrand } from '@/lib/utils/blog';

type TalentAvatar = {
  readonly slug: string;
  readonly name: string;
  readonly initials: string;
};

type Props = {
  readonly brand: DetectedBrand | null;
  readonly categorySlug: string;
  readonly talents: readonly TalentAvatar[];
};

/**
 * ExploraMas — sección de interlinking editorial al final del post.
 *
 * Construye el entity graph HTML real (Google + Gemini + Perplexity ven los
 * enlaces) sin tocar schemas. Adapta los enlaces sugeridos según marca
 * detectada, categoría del post y talentos mencionados.
 *
 * @kind server
 */
export function ExploraMas({ brand, categorySlug, talents }: Props) {
  // Mapping categoría → servicio relevante
  const categoryService = mapCategoryToService(categorySlug);

  // Construye los enlaces sugeridos
  const links: Array<{ href: string; label: string; helper: string }> = [];

  if (brand) {
    links.push({
      href: `/marcas/${brand.slug}`,
      label: `Códigos ${brand.name}`,
      helper: 'Ver bonus actuales',
    });
  }

  if (categoryService) {
    links.push({
      href: categoryService.href,
      label: categoryService.label,
      helper: categoryService.helper,
    });
  }

  // Siempre añade enlaces base relevantes
  links.push({
    href: '/talentos',
    label: 'Roster de creadores',
    helper: 'CS2, Valorant, iGaming',
  });

  links.push({
    href: '/casos',
    label: 'Casos de éxito',
    helper: 'Resultados reales',
  });

  return (
    <section
      className="mt-14 pt-10 border-t border-sp-border"
      aria-labelledby="explora-mas-heading"
    >
      <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
        <h2
          id="explora-mas-heading"
          className="font-display text-lg font-black uppercase text-sp-dark tracking-tight"
        >
          Explora más en SocialPro
        </h2>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-muted">
          {brand ? `${brand.name} · ${categoryFullLabel(categorySlug)}` : categoryFullLabel(categorySlug)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.slice(0, 4).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-sp-border bg-sp-off hover:border-sp-orange/35 hover:bg-white hover:shadow-[0_4px_20px_-8px_rgba(245,99,42,0.18)] transition-all duration-200 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-display text-sm font-black uppercase text-sp-dark tracking-tight leading-tight truncate group-hover:text-sp-orange transition-colors">
                {link.label}
              </p>
              <p className="text-[11px] text-sp-muted mt-0.5 truncate">{link.helper}</p>
            </div>
            <span
              aria-hidden
              className="shrink-0 text-sp-orange/60 group-hover:text-sp-orange group-hover:translate-x-0.5 transition-all duration-200"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      {/* Talents mencionados (si hay) — segunda fila de links HTML reales */}
      {talents.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sp-muted mb-2.5">
            Creadores en este artículo
          </p>
          <div className="flex flex-wrap gap-2">
            {talents.map((t) => (
              <Link
                key={t.slug}
                href={`/talentos/${t.slug}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sp-off border border-sp-border text-[11px] font-bold text-sp-dark hover:border-sp-orange/40 hover:bg-white hover:text-sp-orange transition-all"
              >
                <span aria-hidden className="text-sp-orange/60">@</span>
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function mapCategoryToService(slug: string): { href: string; label: string; helper: string } | null {
  switch (slug) {
    case 'igaming':
      return { href: '/servicios/igaming', label: 'Servicios iGaming', helper: 'DGOJ + FTD tracking' };
    case 'caso-exito':
      return { href: '/servicios', label: 'Cómo trabajamos', helper: 'Servicios SocialPro' };
    case 'guia':
      return { href: '/metodologia', label: 'Nuestra metodología', helper: 'Discovery → Reporting' };
    case 'tendencias':
      return { href: '/agencia-gaming-latam', label: 'Agencia LATAM', helper: 'México · Argentina · Colombia' };
    case 'youtube':
      return { href: '/servicios', label: 'Gestión de canales', helper: 'YouTube gaming' };
    case 'esports':
      return { href: '/influencers-cs2', label: 'Influencers CS2', helper: 'Activaciones competitivas' };
    default:
      return null;
  }
}

function categoryFullLabel(slug: string): string {
  switch (slug) {
    case 'caso-exito': return 'Caso de éxito';
    case 'igaming':    return 'iGaming';
    case 'guia':       return 'Guía';
    case 'tendencias': return 'Tendencias';
    case 'youtube':    return 'YouTube';
    case 'esports':    return 'Esports';
    default:           return 'Insights';
  }
}
