import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { ManageCookiesButton } from './ManageCookiesButton';

export const metadata: Metadata = {
  title: 'Política de Cookies — SocialPro',
  description: 'Qué cookies usa socialpro.es, para qué y cómo gestionarlas. Necesarias, analíticas y marketing.',
  alternates: { canonical: '/cookies' },
  robots: { index: false, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Política de Cookies — SocialPro',
  url: absoluteUrl('/cookies'),
  inLanguage: 'es',
  publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization` },
};

export default function CookiesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors mb-8">
            ← Volver al inicio
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-sp-dark mb-2">
            Política de Cookies
          </h1>
          <p className="text-sm text-sp-muted mb-10">Última actualización: mayo 2026</p>

          <div className="prose prose-sm max-w-none text-sp-muted leading-relaxed space-y-8">

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">¿Qué son las cookies?</h2>
              <p>
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo al
                visitarlos. Se utilizan para mejorar la experiencia de navegación, recordar preferencias y recopilar
                información estadística sobre el uso del sitio.
              </p>
              <p className="mt-3">
                Esta política explica qué cookies utiliza <strong>socialpro.es</strong>, su finalidad y cómo
                puedes gestionarlas.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">Tipos de cookies que usamos</h2>
              <p className="mb-5">Agrupamos las cookies en tres categorías:</p>

              <div className="mt-4 space-y-5">

                {/* Necesarias */}
                <div className="border border-sp-border rounded-xl p-5 bg-sp-bg2/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      Siempre activas
                    </span>
                    <h3 className="font-bold text-sp-dark">Necesarias</h3>
                  </div>
                  <p>
                    Son estrictamente necesarias para el funcionamiento del sitio. No requieren consentimiento
                    y no pueden desactivarse.
                  </p>
                  <table className="mt-3 w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="border-b border-sp-border">
                        <th className="text-left py-1.5 font-bold text-sp-dark">Cookie / clave</th>
                        <th className="text-left py-1.5 font-bold text-sp-dark">Finalidad</th>
                        <th className="text-left py-1.5 font-bold text-sp-dark">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sp-border/50">
                      <tr>
                        <td className="py-1.5 font-mono">sp-consent-v1</td>
                        <td className="py-1.5">Guarda tus preferencias de cookies (localStorage)</td>
                        <td className="py-1.5">Hasta borrar datos</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono">better-auth.session_token</td>
                        <td className="py-1.5">Sesión de usuario en el panel de administración</td>
                        <td className="py-1.5">Sesión / 7 días</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Analíticas */}
                <div className="border border-sp-border rounded-xl p-5 bg-sp-bg2/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                      Requieren consentimiento
                    </span>
                    <h3 className="font-bold text-sp-dark">Analíticas</h3>
                  </div>
                  <p>
                    Nos permiten entender cómo se usa el sitio. Solo se activan si aceptas esta categoría.
                    Incluyen <strong>Google Analytics</strong> (vía Google Tag Manager) y{' '}
                    <strong>Vercel Analytics</strong>.
                  </p>
                  <table className="mt-3 w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="border-b border-sp-border">
                        <th className="text-left py-1.5 font-bold text-sp-dark">Cookie</th>
                        <th className="text-left py-1.5 font-bold text-sp-dark">Proveedor</th>
                        <th className="text-left py-1.5 font-bold text-sp-dark">Finalidad</th>
                        <th className="text-left py-1.5 font-bold text-sp-dark">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sp-border/50">
                      <tr>
                        <td className="py-1.5 font-mono">_ga</td>
                        <td className="py-1.5">Google Analytics</td>
                        <td className="py-1.5">Distingue usuarios únicos</td>
                        <td className="py-1.5">2 años</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono">_ga_*</td>
                        <td className="py-1.5">Google Analytics</td>
                        <td className="py-1.5">Mantiene el estado de sesión</td>
                        <td className="py-1.5">2 años</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono">_gid</td>
                        <td className="py-1.5">Google Analytics</td>
                        <td className="py-1.5">Distingue usuarios (24h)</td>
                        <td className="py-1.5">24 horas</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-mono">va_*</td>
                        <td className="py-1.5">Vercel Analytics</td>
                        <td className="py-1.5">Métricas de rendimiento y visitas</td>
                        <td className="py-1.5">Sesión</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-3 text-[12px]">
                    Google LLC puede transferir datos a servidores en EE.UU. bajo el acuerdo EU-US Data Privacy Framework.
                    Más información en{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                      className="text-sp-orange hover:underline">
                      policies.google.com/privacy
                    </a>.
                  </p>
                </div>

                {/* Marketing */}
                <div className="border border-sp-border rounded-xl p-5 bg-sp-bg2/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                      Requieren consentimiento
                    </span>
                    <h3 className="font-bold text-sp-dark">Marketing</h3>
                  </div>
                  <p>
                    Permiten mostrarte publicidad personalizada y realizar remarketing. Actualmente{' '}
                    <strong>no utilizamos activamente</strong> cookies de marketing, pero la categoría
                    existe para cuando se activen campañas en el futuro. Solo se cargarán con tu consentimiento.
                  </p>
                </div>

              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">Cómo gestionar tus preferencias</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-sp-dark mb-1">Desde nuestro panel de preferencias</h3>
                  <p>
                    Puedes revisar o cambiar tu decisión en cualquier momento haciendo clic en
                    {' '}&ldquo;Gestionar cookies&rdquo; en el pie de página, o usando el botón de abajo:
                  </p>
                  <div className="mt-3">
                    <ManageCookiesButton />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sp-dark mb-1">Desde tu navegador</h3>
                  <p>
                    Puedes configurar o eliminar cookies directamente desde tu navegador:
                  </p>
                  <ul className="mt-2 space-y-1 list-disc pl-5 text-[12px]">
                    <li>
                      <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer"
                        className="text-sp-orange hover:underline">Google Chrome</a>
                    </li>
                    <li>
                      <a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer"
                        className="text-sp-orange hover:underline">Mozilla Firefox</a>
                    </li>
                    <li>
                      <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer"
                        className="text-sp-orange hover:underline">Safari</a>
                    </li>
                    <li>
                      <a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer"
                        className="text-sp-orange hover:underline">Microsoft Edge</a>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-sp-dark mb-1">Opt-out de Google Analytics</h3>
                  <p>
                    Puedes instalar el{' '}
                    <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer"
                      className="text-sp-orange hover:underline">
                      complemento de inhabilitación de Google Analytics
                    </a>{' '}
                    para bloquear el seguimiento en todos los sitios web que lo utilicen.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">Más información</h2>
              <p>
                Para cualquier consulta sobre el uso de cookies puedes contactarnos en{' '}
                <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">
                  marketing@socialpro.es
                </a>.
                Para información completa sobre el tratamiento de tus datos, consulta nuestra{' '}
                <Link href="/privacidad" className="text-sp-orange hover:underline">
                  Política de Privacidad
                </Link>.
              </p>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}
