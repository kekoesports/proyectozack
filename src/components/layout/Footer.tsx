import Link from 'next/link';
import Image from 'next/image';
import { WA_HREF, CONTACT_EMAIL } from '@/lib/utils/constants';

const NAV_COLS = [
  {
    title: 'Agencia',
    links: [
      { href: '/talentos', label: 'Talentos' },
      { href: '/servicios', label: 'Servicios' },
      { href: '/casos', label: 'Casos de Éxito' },
      { href: '/nosotros', label: 'Nosotros' },
      { href: '/metodologia', label: 'Metodología' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Creadores',
    links: [
      { href: '/para-creadores', label: 'Para Creadores' },
      { href: '/talentos', label: 'Ver Roster' },
      { href: '/giveaways', label: 'Giveaways' },
      { href: '/sorteos', label: 'Sorteos de Skins' },
      { href: '/contacto', label: 'Trabaja con nosotros' },
    ],
  },
  {
    title: 'Marcas',
    links: [
      { href: '/servicios/igaming', label: 'Campañas iGaming' },
      { href: '/servicios', label: 'Talent Management' },
      { href: '/marcas/login', label: 'Portal de Marcas' },
      { href: '/contacto', label: 'Solicitar propuesta' },
    ],
  },
  {
    title: 'Especialidades',
    links: [
      { href: '/cs2-influencer-marketing',  label: 'CS2 Influencer Marketing' },
      { href: '/valorant-influencers-agency', label: 'Valorant Influencers' },
      { href: '/betting-influencers',        label: 'Betting Influencers' },
      { href: '/esports-marketing-agency',   label: 'Esports Marketing' },
      { href: '/twitch-streamers-agency',    label: 'Twitch Streamers' },
    ],
  },
];

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/socialproes/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/socialproes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.13 8.13 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
      </svg>
    ),
  },
];

const STATS = [
  { value: '13+', label: 'Años de experiencia' },
  { value: '15M', label: 'Views al mes' },
  { value: '3', label: 'Mercados activos' },
];

/**
 * Footer global de la web pública: stats strip, columnas de navegación,
 * datos de contacto, redes sociales y bottom bar con enlaces legales.
 *
 * @kind server
 * @feature layout
 */
export function Footer() {
  return (
    <footer className="bg-sp-black text-white">

      {/* Stats strip */}
      <section aria-label="Métricas de la agencia" className="border-t border-b border-white/5" style={{ background: 'linear-gradient(90deg,rgba(245,99,42,0.04) 0%,rgba(139,58,173,0.04) 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap justify-center gap-12 sm:gap-24">
          {STATS.map(({ value, label }) => (
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-8 md:gap-10">

          {/* Brand column */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logos/4.png"
                alt="SocialPro"
                width={140}
                height={35}
                className="brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>

            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              Agencia de talentos gaming &amp; esports. Conectamos creadores con marcas líderes en iGaming, periféricos y entretenimiento digital.
            </p>

            {/* Contact */}
            <address className="space-y-2 not-italic">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2.5 text-sm text-white/40 hover:text-white transition-colors group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sp-orange">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                {CONTACT_EMAIL}
              </a>
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-white/40 hover:text-white transition-colors group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                +34 604 868 426
              </a>
            </address>

            {/* Socials */}
            <nav aria-label="Redes sociales" className="flex gap-3">
              {SOCIALS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all hover:-translate-y-0.5"
                >
                  {icon}
                </a>
              ))}
            </nav>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-white/50 hover:text-white transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} SocialPro. Todos los derechos reservados.
          </p>
          <div className="flex gap-5 text-xs text-white/25">
            <Link href="/privacidad" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="/cookies" className="hover:text-white/60 transition-colors">Cookies</Link>
            <Link href="/legal" className="hover:text-white/60 transition-colors">Aviso Legal</Link>
          </div>
          <p className="text-xs text-white/20">
            Gaming &amp; Esports · España · LatAm · Turquía
          </p>
        </div>
      </div>
    </footer>
  );
}
