'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { WA_HREF, CONTACT_EMAIL } from '@/lib/utils/constants';
import { localeFromPathname, type Locale } from '@/lib/locale';
import { openConsentBanner } from '@/lib/consent/consentStore';
import { ESTADISTICAS_NOINDEX } from '@/lib/feature-flags';

type NavLink = {
  readonly href: string;
  readonly label: string;
  readonly subheading?: string;
};

type NavCol = {
  readonly title: string;
  readonly links: readonly NavLink[];
  /** Renderiza los links en un grid 2-col en vez de lista vertical */
  readonly inline?: boolean;
};

// IMPORTANTE: la columna "Especialidades" preserva la decisión del PR #51
// (iGaming & Betting → /servicios/igaming como hub ES único).
const NAV_COLS_BY_LOCALE: Record<Locale, readonly NavCol[]> = {
  es: [
    {
      title: 'Agencia',
      links: [
        { href: '/talentos',    label: 'Talentos' },
        { href: '/servicios',   label: 'Servicios' },
        { href: '/casos',       label: 'Casos de Éxito' },
        { href: '/nosotros',    label: 'Nosotros' },
        { href: '/metodologia', label: 'Metodología' },
      ],
    },
    {
      title: 'Creadores',
      links: [
        { href: '/para-creadores', label: 'Para Creadores' },
        { href: '/codigos',        label: 'Códigos' },
        { href: '/sorteos',        label: 'Sorteos' },
        { href: '/contacto',       label: 'Trabaja con nosotros' },
      ],
    },
    {
      title: 'Marcas',
      links: [
        { href: '/servicios/igaming', label: 'Campañas iGaming' },
        { href: '/servicios',         label: 'Talent Management' },
        { href: '/marcas',             label: 'Portal de Marcas' },
        { href: '/contacto',          label: 'Solicitar propuesta' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { href: '/blog',               label: 'Blog' },
        { href: '/news',               label: 'News' },
        { href: '/estadisticas',       label: 'Estadísticas' },
        { href: '/marcas/keydrop',     label: 'Keydrop',     subheading: 'Partners' },
        { href: '/marcas/hellcase',    label: 'Hellcase' },
        { href: '/marcas/skinplace',   label: 'Skinplace' },
        { href: '/marcas/skinsmonkey', label: 'Skinsmonkey' },
      ],
    },
    {
      title: 'Especialidades',
      inline: true,
      links: [
        { href: '/cs2-influencer-marketing',        label: 'CS2 Influencer Marketing' },
        { href: '/valorant-influencers-agency',      label: 'Valorant Influencers' },
        { href: '/servicios/igaming',                label: 'iGaming & Betting' },
        { href: '/esports-marketing-agency',         label: 'Esports Marketing' },
        { href: '/twitch-streamers-agency',          label: 'Twitch Streamers Agency' },
        { href: '/influencers-cs2',                  label: 'Influencers CS2 (ES)' },
        { href: '/agencia-marketing-esports',        label: 'Agencia Esports (ES)' },
        { href: '/agencia-gaming-latam',             label: 'Gaming LATAM' },
        { href: '/apuesta-segura-cs2',               label: 'Apuesta Segura CS2' },
        { href: '/guia-dgoj-igaming-influencers',    label: 'Guía DGOJ iGaming' },
      ],
    },
  ],
  en: [
    {
      title: 'Agency',
      links: [
        { href: '/talents',     label: 'Talent' },
        { href: '/services',    label: 'Services' },
        { href: '/cases',       label: 'Case Studies' },
        { href: '/nosotros',    label: 'About (ES)' },
        { href: '/metodologia', label: 'Methodology (ES)' },
      ],
    },
    {
      title: 'Creators',
      links: [
        { href: '/para-creadores', label: 'For Creators (ES)' },
        { href: '/codigos',        label: 'Codes' },
        { href: '/sorteos',        label: 'Skin Giveaways (ES)' },
        { href: '/contact',        label: 'Work with us' },
      ],
    },
    {
      title: 'Brands',
      links: [
        { href: '/servicios/igaming', label: 'iGaming Campaigns (ES)' },
        { href: '/services',          label: 'Talent Management' },
        { href: '/marcas',             label: 'Brand Portal (ES)' },
        { href: '/contact',           label: 'Request a proposal' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { href: '/blog',               label: 'Blog (ES)' },
        { href: '/news',               label: 'News (ES)' },
        { href: '/estadisticas',       label: 'Statistics (ES)' },
        { href: '/marcas/keydrop',     label: 'Keydrop',     subheading: 'Partners' },
        { href: '/marcas/hellcase',    label: 'Hellcase' },
        { href: '/marcas/skinplace',   label: 'Skinplace' },
        { href: '/marcas/skinsmonkey', label: 'Skinsmonkey' },
      ],
    },
    {
      title: 'Specialties',
      inline: true,
      links: [
        { href: '/cs2-influencer-marketing',        label: 'CS2 Influencer Marketing' },
        { href: '/valorant-influencers-agency',      label: 'Valorant Influencers' },
        { href: '/servicios/igaming',                label: 'iGaming & Betting (ES)' },
        { href: '/esports-marketing-agency',         label: 'Esports Marketing' },
        { href: '/twitch-streamers-agency',          label: 'Twitch Streamers Agency' },
        { href: '/influencers-cs2',                  label: 'Influencers CS2 (ES)' },
        { href: '/agencia-marketing-esports',        label: 'Agencia Esports (ES)' },
        { href: '/agencia-gaming-latam',             label: 'Gaming LATAM' },
        { href: '/apuesta-segura-cs2',               label: 'Apuesta Segura CS2 (ES)' },
        { href: '/guia-dgoj-igaming-influencers',    label: 'DGOJ iGaming Guide (ES)' },
      ],
    },
  ],
};

const STATS_BY_LOCALE: Record<Locale, readonly { value: string; label: string }[]> = {
  es: [
    { value: '13+', label: 'Años de experiencia' },
    { value: '15M', label: 'Views al mes' },
    { value: 'ES + LatAm', label: 'Mercados activos' },
  ],
  en: [
    { value: '13+', label: 'Years of experience' },
    { value: '15M', label: 'Monthly views' },
    { value: 'ES + LatAm', label: 'Active markets' },
  ],
};

const COPY_BY_LOCALE: Record<Locale, {
  readonly metricsLabel: string;
  readonly brandIntro: string;
  readonly socialsLabel: string;
  readonly rights: string;
  readonly privacy: string;
  readonly cookies: string;
  readonly legal: string;
  readonly manageCookies: string;
  readonly tagline: string;
}> = {
  es: {
    metricsLabel: 'Métricas de la agencia',
    brandIntro: 'Agencia de talentos gaming & esports. España y LatAm.',
    socialsLabel: 'Redes sociales',
    rights: 'Todos los derechos reservados.',
    privacy: 'Privacidad',
    cookies: 'Cookies',
    legal: 'Aviso Legal',
    manageCookies: 'Gestionar cookies',
    tagline: 'Gaming & Esports · España · LatAm · Europa',
  },
  en: {
    metricsLabel: 'Agency metrics',
    brandIntro: 'Gaming & esports talent agency. Spain & LatAm.',
    socialsLabel: 'Social media',
    rights: 'All rights reserved.',
    privacy: 'Privacy',
    cookies: 'Cookies',
    legal: 'Legal',
    manageCookies: 'Manage cookies',
    tagline: 'Gaming & Esports · Spain · LatAm · Europe',
  },
};

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/socialproes/',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: 'X / Twitter',
    href: 'https://x.com/SocialProES',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/socialproes',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@socialproes',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.13 8.13 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
      </svg>
    ),
  },
];

/**
 * Footer global de la web pública. Detecta locale por pathname y traduce
 * columnas de navegación, stats y bottom bar al inglés cuando aplica.
 *
 * @kind client
 * @feature layout
 */
export function Footer() {
  const pathname = usePathname() ?? '/';
  const locale = localeFromPathname(pathname);
  const stats   = STATS_BY_LOCALE[locale];
  const copy    = COPY_BY_LOCALE[locale];

  const navCols = NAV_COLS_BY_LOCALE[locale].map((col) => ({
    ...col,
    links: ESTADISTICAS_NOINDEX
      ? col.links.filter((l) => l.href !== '/estadisticas')
      : col.links,
  }));

  const regularCols = navCols.filter((c) => !c.inline);
  const inlineCols  = navCols.filter((c) => c.inline);

  return (
    <footer className="bg-sp-black text-white">

      {/* Stats strip — sin cambios */}
      <section aria-label={copy.metricsLabel} className="border-t border-b border-white/5" style={{ background: 'linear-gradient(90deg,rgba(245,99,42,0.04) 0%,rgba(139,58,173,0.04) 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-wrap justify-center gap-10 sm:gap-20">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-3xl font-black" style={{
                background: 'linear-gradient(90deg,#f5632a,#e03070,#8b3aad)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {value}
              </p>
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Grid 5 columnas: marca + 4 nav
            mobile  → 1 col (todo apilado)
            sm      → 2 col (marca full-width, nav en 2×2)
            lg      → 5 col (1.5fr + 4×1fr) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-8 lg:gap-6">

          {/* Columna marca */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
            <Link href={locale === 'en' ? '/en' : '/'} className="inline-block">
              <Image
                src="/images/logos/4.png"
                alt="SocialPro"
                width={110}
                height={28}
                className="brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>

            <p className="text-xs text-white/40 leading-snug max-w-[220px]">
              {copy.brandIntro}
            </p>

            {/* Contacto + redes en una fila */}
            <div className="flex items-center gap-2 flex-wrap">
              <address className="flex items-center gap-2 not-italic">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  aria-label="Email"
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-sp-orange hover:border-white/30 hover:text-white transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </a>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[#25D366] hover:border-white/30 hover:text-white transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>
              </address>

              <div className="w-px h-4 bg-white/[0.08]" />

              <nav aria-label={copy.socialsLabel} className="flex gap-2">
                {SOCIALS.map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                  >
                    {icon}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Columnas de navegación regulares */}
          {regularCols.map((col) => (
            <div key={col.title}>
              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map(({ href, label, subheading }) => (
                  <li key={href}>
                    {subheading && (
                      <div className="flex items-center gap-2 pt-1 pb-0.5">
                        <div className="h-px flex-1 bg-white/[0.07]" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
                          {subheading}
                        </span>
                        <div className="h-px flex-1 bg-white/[0.07]" />
                      </div>
                    )}
                    <Link
                      href={href}
                      className="text-xs text-white/50 hover:text-white transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Especialidades — grid 2-col en sm, 3-col en lg */}
        {inlineCols.map((col) => (
          <div key={col.title} className="mt-8 pt-6 border-t border-white/[0.05]">
            <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">
              {col.title}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
              {col.links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sub-bar legal Giveaways — Fase 0 legal */}
      <div className="border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-white/25">
          <span className="uppercase tracking-[0.2em] font-bold text-white/30">SocialPro Giveaways</span>
          <Link href="/sorteos/terminos" className="hover:text-white/60 transition-colors">Bases de sorteos</Link>
          <Link href="/sorteos/recompensas-y-puntos" className="hover:text-white/60 transition-colors">Recompensas y puntos</Link>
          <Link href="/sorteos/partners-externos" className="hover:text-white/60 transition-colors">Partners externos</Link>
          <Link href="/sorteos/participacion-responsable" className="hover:text-white/60 transition-colors">Participación responsable</Link>
        </div>
      </div>

      {/* Bottom bar — copyright + legales generales */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} SocialPro. {copy.rights}
          </p>
          <div className="flex gap-4 text-xs text-white/25">
            <Link href="/privacidad" className="hover:text-white/60 transition-colors">{copy.privacy}</Link>
            <Link href="/cookies" className="hover:text-white/60 transition-colors">{copy.cookies}</Link>
            <Link href="/legal" className="hover:text-white/60 transition-colors">{copy.legal}</Link>
            <Link href="/contacto" className="hover:text-white/60 transition-colors">Contacto</Link>
            <button
              type="button"
              onClick={openConsentBanner}
              className="hover:text-white/60 transition-colors"
            >
              {copy.manageCookies}
            </button>
          </div>
          <p className="text-xs text-white/20">
            {copy.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
