import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Términos y Condiciones de los Sorteos — SocialPro',
  description:
    'Condiciones generales de participación en los sorteos de SocialPro. Mayores de 18 años. Gratuito y sin obligación de compra.',
  alternates: { canonical: '/terminos-sorteos' },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Términos y Condiciones de Sorteos — SocialPro',
  url: absoluteUrl('/terminos-sorteos'),
  inLanguage: 'es',
  publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization` },
};

export default function TerminosSorteosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
          <Link href="/sorteos" className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors mb-8">
            ← Volver a sorteos
          </Link>

          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase text-sp-dark mb-2">
            Términos y condiciones de los sorteos
          </h1>
          <p className="text-sm text-sp-muted mb-10">Última actualización: mayo 2026</p>

          <div className="prose prose-sm max-w-none text-sp-muted leading-relaxed space-y-8">

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">1. Organizador</h2>
              <p>
                Los sorteos publicados en <strong>socialpro.es</strong> son organizados por los creadores de contenido
                gestionados por SocialPro en colaboración con las marcas patrocinadoras indicadas en cada sorteo
                (Keydrop, Skinplace, SkinsMonkey, Hellcase u otras). SocialPro actúa como intermediario y gestor
                de comunicación entre el creador y la marca.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">2. Participación</h2>
              <p>
                La participación en los sorteos es <strong>gratuita y voluntaria</strong>. No existe obligación de
                compra ni depósito económico para participar en los sorteos marcados como gratuitos. Los participantes
                deben ser <strong>mayores de 18 años</strong>.
              </p>
              <p className="mt-3">
                Algunos sorteos pueden requerir registro previo en la plataforma del patrocinador. Dicho registro
                puede implicar aceptar los términos propios de esa plataforma, sobre los que SocialPro no tiene
                responsabilidad.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">3. Premio y selección del ganador</h2>
              <p>
                El premio de cada sorteo está descrito en la página del creador correspondiente. La selección del
                ganador se realiza de forma aleatoria a través de los mecanismos de la plataforma patrocinadora o
                del creador organizador, garantizando igualdad de oportunidades para todos los participantes
                elegibles.
              </p>
              <p className="mt-3">
                El ganador será anunciado en el canal del creador (Twitch, YouTube o Instagram) en el plazo
                indicado en cada sorteo. SocialPro no se hace responsable de la entrega física o digital del
                premio, que recae sobre la marca patrocinadora.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">4. Edad mínima (+18)</h2>
              <p>
                Los sorteos vinculados a plataformas de skins de CS2, casino online o apuestas deportivas están
                destinados exclusivamente a mayores de 18 años. Al participar, el usuario declara tener la edad
                mínima legal requerida en su país de residencia para este tipo de actividades.
              </p>
              <p className="mt-3">
                Si el juego te está causando problemas, solicita ayuda en{' '}
                <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer"
                  className="text-sp-orange hover:underline">
                  jugarbien.es
                </a>{' '}
                o llama al <a href="tel:900200225" className="text-sp-orange hover:underline">900 200 225</a> (gratuito, 24h).
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">5. Privacidad y datos</h2>
              <p>
                SocialPro no recoge datos personales de los participantes directamente. Si la participación
                requiere facilitar datos a la plataforma patrocinadora, el tratamiento de dichos datos se rige por
                la política de privacidad de esa plataforma. Para cualquier consulta sobre datos personales
                gestionados por SocialPro, escribe a{' '}
                <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">
                  marketing@socialpro.es
                </a>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">6. Exención de responsabilidad</h2>
              <p>
                SocialPro no garantiza la disponibilidad continua de los sorteos ni se responsabiliza de
                interrupciones técnicas en las plataformas de terceros. Los sorteos pueden ser cancelados o
                modificados por el creador o la marca patrocinadora sin previo aviso.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">7. Legislación aplicable</h2>
              <p>
                Estas condiciones se rigen por la legislación española vigente. Para sorteos con participantes
                en otros países de la UE o LATAM, se aplicará la normativa local correspondiente en todo aquello
                que resulte más favorable para el participante.
              </p>
            </section>

            <section>
              <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3">8. Contacto</h2>
              <p>
                Para cualquier consulta sobre estos términos o sobre un sorteo concreto:{' '}
                <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">
                  marketing@socialpro.es
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
