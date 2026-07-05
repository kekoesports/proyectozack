import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Partners externos · SocialPro Giveaways',
  description:
    'Listado de partners externos vinculados a SocialPro Giveaways: qué son, qué ofrecen, cómo los tratamos y qué queda fuera de nuestra responsabilidad. Borrador.',
  alternates: { canonical: '/sorteos/partners-externos' },
  robots: { index: false, follow: false },
};

export default function PartnersExternosPage() {
  return (
    <>
      <header className="gp-legal-header">
        <p className="gp-legal-eyebrow">SocialPro Giveaways</p>
        <h1>Partners externos</h1>
        <p className="gp-legal-sub">
          Última actualización del borrador: julio 2026. Este documento explica cómo
          tratamos las plataformas externas que aparecen en las páginas de los creadores y
          qué queda fuera del alcance de SocialPro.
        </p>
      </header>

      <section className="gp-legal-section">
        <h2>1. Qué son</h2>
        <p>
          Un &ldquo;partner externo&rdquo; es una plataforma independiente (por ejemplo un marketplace de
          skins o una web con promociones de creadores) que aparece en la ficha de un creador
          porque el propio creador tiene un código o una colaboración con ella. SocialPro
          <b> no opera</b> esas plataformas ni gestiona sus premios, bonos, comisiones o
          disputas.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>2. Cómo los presentamos</h2>
        <ul>
          <li>Cada card externa lleva un aviso visible del tipo &ldquo;Es una plataforma externa&rdquo;.</li>
          <li>El CTA que sale de SocialPro está claramente diferenciado del CTA de los sorteos internos.</li>
          <li>En países donde no hemos validado la legalidad del partner, mostramos una versión reducida sin promesa de bonos ni condiciones económicas.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>3. Lo que SocialPro NO hace con los partners externos</h2>
        <ul>
          <li>No gestiona depósitos, retiros ni transacciones en su nombre.</li>
          <li>No modifica el saldo interno de puntos por acciones económicas en el partner.</li>
          {/* @allow-sensitive-copy: enumera compromisos negativos — necesita citar los conceptos */}
          <li>No otorga tickets adicionales por depositar ni por hacer wagering.</li>
          <li>No se responsabiliza de las condiciones cambiantes de bonos, promociones o eventos del partner.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>4. Responsabilidad del usuario</h2>
        <p>
          Al hacer clic en una CTA externa, sales de SocialPro y aceptas los términos de la
          plataforma de destino. Es responsabilidad del usuario:
        </p>
        <ul>
          <li>Comprobar si la plataforma opera legalmente en su jurisdicción.</li>
          <li>Verificar la edad mínima requerida por la plataforma externa (nunca inferior a 18 años).</li>
          <li>Leer los términos y condiciones de la plataforma externa antes de participar.</li>
        </ul>
        <p>
          Si tienes dudas sobre operativa que pueda encajar como actividad de juego regulada,
          consulta la información publicada por la{' '}
          <a
            href="https://www.ordenacionjuego.es"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dirección General de Ordenación del Juego
          </a>{' '}
          o revisa nuestra página de{' '}
          <Link href="/sorteos/participacion-responsable">Participación responsable</Link>.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>5. Sistema de puntos y partners externos</h2>
        <p>
          Este es el punto más importante: los partners externos <b>nunca modifican</b> el
          saldo interno de puntos de SocialPro. No se otorgan puntos por depositar ni por
          jugar en una plataforma externa. La única forma de conseguir puntos es a través de
          las fuentes descritas en{' '}
          <Link href="/sorteos/recompensas-y-puntos">Recompensas y puntos</Link>.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>6. Contacto</h2>
        <p>
          Si detectas un partner externo mal presentado, un CTA confuso o una incidencia con
          una plataforma externa, escríbenos a{' '}
          <a href="mailto:info@socialpro.es">info@socialpro.es</a> para revisarlo.
        </p>
      </section>
    </>
  );
}
