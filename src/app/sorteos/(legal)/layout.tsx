import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LegalDraftBanner } from '@/features/giveaway-platform/components/LegalDraftBanner';

import '../plataforma/platform.css';
import '../plataforma/platform-legal.css';

/**
 * Layout compartido de las páginas legales de SocialPro Giveaways.
 * Route group `(legal)` → no aparece en la URL final.
 *
 * Se reutiliza la escena visual dark (`.giveaway-platform`) pero SIN el
 * PlatformNav interactivo: nav minimalista con logo + links entre las 4
 * páginas legales. Todas las páginas montan LegalDraftBanner arriba.
 */
const LEGAL_NAV = [
  { href: '/sorteos/faq',                       label: 'FAQ' },
  { href: '/sorteos/recompensas-y-puntos',      label: 'Recompensas y puntos' },
  { href: '/sorteos/terminos',                  label: 'Términos' },
  { href: '/sorteos/privacidad',                label: 'Privacidad' },
  { href: '/sorteos/participacion-responsable', label: 'Participación responsable' },
  { href: '/sorteos/partners-externos',         label: 'Partners externos' },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="giveaway-platform">
      <nav className="gp-legal-nav" aria-label="Documentos legales">
        <div className="gp-legal-nav-inner">
          <Link href="/sorteos" className="gp-logo" aria-label="Volver a SocialPro Giveaways">
            <Image
              src="/logo.png"
              alt="SocialPro"
              width={130}
              height={68}
              className="gp-logo-img"
              priority
            />
            <span className="gp-logo-tag">
              <b>Giveaways</b>
              <span>Documentos legales</span>
            </span>
          </Link>
          <div className="gp-legal-nav-links">
            {LEGAL_NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="gp-legal-wrap">
        <LegalDraftBanner />
        {children}

        <footer className="gp-legal-foot">
          <p>
            <b>SocialPro Giveaways</b> · Plataforma de sorteos gratuitos ·
            +18 · Participa con responsabilidad.
          </p>
          <p className="gp-legal-foot-links">
            <Link href="/sorteos">← Volver a la plataforma</Link>
            {LEGAL_NAV.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </p>
        </footer>
      </main>
    </div>
  );
}
