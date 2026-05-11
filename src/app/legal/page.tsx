import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Aviso Legal — SocialPro',
  description: 'Información legal y condiciones de uso del sitio web socialpro.es. Datos del titular, propiedad intelectual y responsabilidades.',
  alternates: { canonical: '/legal' },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Aviso Legal — SocialPro',
  url: absoluteUrl('/legal'),
  inLanguage: 'es',
  publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization` },
};

export default function AvisoLegalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors mb-8">
            ← Volver al inicio
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-sp-dark mb-2">
            Aviso Legal
          </h1>
          <p className="text-sm text-sp-muted mb-10">Última actualización: mayo 2026</p>

          <div className="prose prose-sm max-w-none text-sp-muted leading-relaxed space-y-8">

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">1. Datos del titular</h2>
              <p>
                En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y
                del Comercio Electrónico (LSSI-CE), se informa que el presente sitio web <strong>socialpro.es</strong>{' '}
                es titularidad de:
              </p>
              <ul className="mt-3 space-y-1 list-none pl-0">
                <li><strong>Denominación social:</strong> ELEVATEX AGENCY PA SL</li>
                <li><strong>Nombre comercial:</strong> SocialPro</li>
                <li><strong>CIF:</strong> B21821046</li>
                <li><strong>VAT/ROI:</strong> ESB21821046</li>
                <li><strong>Domicilio social:</strong> Calle Teruel 19, 3º3, 14011 Córdoba, España</li>
                <li><strong>Email de contacto:</strong>{' '}
                  <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">
                    marketing@socialpro.es
                  </a>
                </li>
                <li><strong>Teléfono:</strong> +34 604 868 426</li>
                <li><strong>Actividad:</strong> Agencia de representación de talentos y creadores de contenido en los sectores gaming y esports. Gestión de campañas con marcas, sorteos y contenido editorial.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">2. Objeto y condiciones de uso</h2>
              <p>
                El acceso y uso de este sitio web está sujeto a las presentes condiciones. El simple acceso implica
                la aceptación de las mismas. SocialPro se reserva el derecho a modificar estas condiciones en cualquier
                momento, siendo responsabilidad del usuario consultarlas periódicamente.
              </p>
              <p className="mt-3">
                El sitio web tiene carácter informativo y comercial: presenta los servicios de la agencia, el roster
                de creadores gestionados, casos de éxito, contenido editorial sobre esports y CS2, y herramientas
                de participación en sorteos y campañas de marcas.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">3. Propiedad intelectual e industrial</h2>
              <p>
                Todos los contenidos de este sitio web —textos, imágenes, logotipos, vídeos, gráficos, código fuente
                y cualquier otro elemento— son propiedad de SocialPro o de sus colaboradores y están protegidos por
                la legislación española e internacional sobre propiedad intelectual e industrial.
              </p>
              <p className="mt-3">
                Queda expresamente prohibida la reproducción, distribución, comunicación pública o transformación de
                cualquier contenido sin autorización previa y por escrito de SocialPro, salvo en los casos previstos
                por la ley.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">4. Responsabilidad</h2>
              <p>
                SocialPro no garantiza la disponibilidad continua del sitio ni la ausencia de errores en sus contenidos.
                La empresa se exime de responsabilidad por daños derivados del uso del sitio, interrupciones del servicio
                o contenidos de terceros enlazados.
              </p>
              <p className="mt-3">
                Los sorteos y campañas publicitarias que aparecen en el sitio son gestionados en colaboración con
                marcas externas. Cada sorteo tiene sus propias bases legales, disponibles en la página correspondiente
                o en la plataforma del organizador.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">5. Política de privacidad y cookies</h2>
              <p>
                El tratamiento de datos personales se regula en nuestra{' '}
                <Link href="/privacidad" className="text-sp-orange hover:underline">Política de Privacidad</Link>.
                La información sobre el uso de cookies se encuentra en nuestra{' '}
                <Link href="/cookies" className="text-sp-orange hover:underline">Política de Cookies</Link>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">6. Ley aplicable y jurisdicción</h2>
              <p>
                Las presentes condiciones se rigen por la legislación española vigente. Para cualquier controversia
                derivada del uso de este sitio, las partes se someten a la jurisdicción de los Juzgados y Tribunales
                de Córdoba, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, salvo que la
                normativa imperativa aplicable establezca otro fuero.
              </p>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}
