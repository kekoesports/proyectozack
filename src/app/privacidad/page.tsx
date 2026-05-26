import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Política de Privacidad — SocialPro',
  description: 'Cómo SocialPro recoge, usa y protege tus datos personales. Información sobre tus derechos RGPD y cómo ejercerlos.',
  alternates: { canonical: '/privacidad' },
  robots: { index: false, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Política de Privacidad — SocialPro',
  url: absoluteUrl('/privacidad'),
  inLanguage: 'es',
  publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization` },
};

export default function PrivacidadPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <main className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors mb-8">
            ← Volver al inicio
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-sp-dark mb-2">
            Política de Privacidad
          </h1>
          <p className="text-sm text-sp-muted mb-10">Última actualización: mayo 2026</p>

          <div className="prose prose-sm max-w-none text-sp-muted leading-relaxed space-y-8">

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">1. Responsable del tratamiento</h2>
              <ul className="space-y-1 list-none pl-0">
                <li><strong>Denominación social:</strong> ELEVATEX AGENCY PA SL</li>
                <li><strong>Nombre comercial:</strong> SocialPro</li>
                <li><strong>CIF:</strong> B21821046</li>
                <li><strong>Domicilio:</strong> Calle Teruel 19, 3º3, 14011 Córdoba, España</li>
                <li><strong>Email:</strong>{' '}
                  <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">
                    marketing@socialpro.es
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">2. Qué datos recogemos y por qué</h2>
              <p>SocialPro recoge datos personales en las siguientes situaciones:</p>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-bold text-sp-dark">Formulario de contacto y solicitud de propuesta</h3>
                  <p>Nombre, email y empresa (si aplica). <strong>Base jurídica:</strong> ejecución de medidas precontractuales
                  (art. 6.1.b RGPD). Finalidad: responder tu consulta y, en su caso, gestionar la relación comercial.</p>
                </div>
                <div>
                  <h3 className="font-bold text-sp-dark">Participación en sorteos y campañas</h3>
                  <p>Los datos recogidos en sorteos (handle de redes sociales, etc.) se tratan según las bases legales
                  específicas de cada sorteo, publicadas en sus propias bases legales. <strong>Base jurídica:</strong> consentimiento (art. 6.1.a RGPD).</p>
                </div>
                <div>
                  <h3 className="font-bold text-sp-dark">Análisis de uso del sitio web (cookies analíticas)</h3>
                  <p>Datos anónimos de navegación recogidos mediante Google Tag Manager si el usuario otorga su
                  consentimiento en el banner de cookies. <strong>Base jurídica:</strong> consentimiento (art. 6.1.a RGPD).</p>
                </div>
                <div>
                  <h3 className="font-bold text-sp-dark">Colaboración con creadores y marcas</h3>
                  <p>Datos profesionales (nombre, email, redes sociales, métricas) de creadores y contactos de marcas
                  gestionados a través del CRM interno. <strong>Base jurídica:</strong> ejecución del contrato (art. 6.1.b RGPD).</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">3. Destinatarios de los datos</h2>
              <p>SocialPro no vende ni cede tus datos personales a terceros sin tu consentimiento, salvo:</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Proveedores de infraestructura tecnológica (Vercel, Neon Postgres) bajo acuerdos de encargado del tratamiento.</li>
                <li>Google LLC (Google Tag Manager / Analytics) si aceptas cookies analíticas, con tratamiento en la UE o con cláusulas contractuales tipo.</li>
                <li>Obligaciones legales: cuando sea requerido por autoridades competentes.</li>
                <li>En campañas: las marcas patrocinadoras reciben únicamente los datos necesarios para la ejecución de la campaña.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">4. Plazo de conservación</h2>
              <p>
                Los datos de contacto se conservan durante el tiempo necesario para atender la consulta y, en su caso,
                durante la duración de la relación comercial más los plazos legales de prescripción (hasta 5 años para
                reclamaciones civiles según el Código Civil español).
              </p>
              <p className="mt-3">
                Las cookies analíticas se eliminan según los plazos definidos en nuestra{' '}
                <Link href="/cookies" className="text-sp-orange hover:underline">Política de Cookies</Link>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">5. Tus derechos</h2>
              <p>Bajo el RGPD, tienes derecho a:</p>
              <ul className="mt-3 space-y-1 list-disc pl-5">
                <li><strong>Acceso:</strong> conocer qué datos tenemos sobre ti.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de tus datos («derecho al olvido»).</li>
                <li><strong>Limitación:</strong> restringir el tratamiento en determinadas circunstancias.</li>
                <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado y de uso común.</li>
                <li><strong>Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
                <li><strong>Retirar el consentimiento</strong> en cualquier momento, sin que ello afecte a la licitud del tratamiento previo.</li>
              </ul>
              <p className="mt-4">
                Para ejercer cualquiera de estos derechos, contacta con nosotros en{' '}
                <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">
                  marketing@socialpro.es
                </a>{' '}
                indicando tu solicitud. Responderemos en el plazo máximo de 30 días.
              </p>
              <p className="mt-3">
                Si consideras que el tratamiento de tus datos no cumple la normativa vigente, puedes presentar
                una reclamación ante la Agencia Española de Protección de Datos (AEPD) en{' '}
                <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-sp-orange hover:underline">
                  www.aepd.es
                </a>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">6. Seguridad</h2>
              <p>
                SocialPro aplica medidas técnicas y organizativas adecuadas para proteger tus datos contra acceso
                no autorizado, pérdida, alteración o divulgación. El sitio utiliza HTTPS en todas las comunicaciones.
                El acceso al panel de gestión requiere autenticación.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">7. Menores de edad</h2>
              <p>
                Este sitio web no está dirigido a menores de 14 años. SocialPro no recoge conscientemente datos
                de menores. Si detectas que un menor ha facilitado datos sin consentimiento parental, contáctanos
                para proceder a su eliminación inmediata.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">8. Actualizaciones</h2>
              <p>
                Esta política puede actualizarse para reflejar cambios en el tratamiento de datos o en la legislación
                aplicable. La versión vigente siempre estará disponible en{' '}
                <Link href="/privacidad" className="text-sp-orange hover:underline">
                  socialpro.es/privacidad
                </Link>.
              </p>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}
