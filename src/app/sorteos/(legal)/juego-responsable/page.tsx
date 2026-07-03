import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Juego responsable · SocialPro Giveaways',
  description:
    'Compromiso con el juego responsable en SocialPro Giveaways: los sorteos internos son gratuitos y no son apuestas. Información y recursos de ayuda si el juego te está causando problemas. Borrador.',
  alternates: { canonical: '/sorteos/juego-responsable' },
  robots: { index: false, follow: false },
};

export default function JuegoResponsablePage() {
  return (
    <>
      <header className="gp-legal-header">
        <p className="gp-legal-eyebrow">SocialPro Giveaways</p>
        <h1>Juego responsable</h1>
        <p className="gp-legal-sub">
          Última actualización del borrador: julio 2026. Los sorteos internos de SocialPro
          Giveaways son gratuitos y no constituyen apuestas.
        </p>
      </header>

      <section className="gp-legal-section">
        <h2>1. Qué es (y qué no es) SocialPro Giveaways</h2>
        <p>
          Los sorteos internos publicados en <code>/sorteos</code> son{' '}
          <b>gratuitos</b>, no requieren depósito ni ninguna forma de pago y no reparten dinero
          en metálico. Los puntos ⭐ son recompensas internas sin valor monetario. Este servicio,
          en su parte interna, <b>no es una actividad de juego regulado</b> conforme a la Ley
          13/2011.
        </p>
        <p>
          Aun así, promocionamos y enlazamos plataformas externas (por ejemplo, KeyDrop) donde
          <b>sí</b> puede haber transacciones económicas y funcionamiento de tipo casino/cajas.
          Por eso incluimos esta guía: si vas a interactuar con esos partners, hazlo desde una
          decisión informada y responsable.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>2. Compromisos de la plataforma</h2>
        <ul>
          <li>Restringimos el acceso a mayores de 18 años.</li>
          <li>No aceptamos depósitos económicos dentro de la plataforma interna.</li>
          <li>
            No usamos mecánicas persuasivas agresivas: no ocultamos costes, no fingimos
            escasez artificial y las participaciones se cuentan en tickets, no en dinero.
          </li>
          <li>Ofrecemos ranking read-only y modo de perfil privado para quien no quiera
              aparecer con su nombre real.</li>
          <li>Mostramos con claridad cuándo un CTA sale hacia un partner externo.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>3. Señales de alerta</h2>
        <p>Es momento de parar si:</p>
        <ul>
          <li>Gastas más dinero del que puedes permitirte en partners externos.</li>
          <li>Persigues pérdidas o intentas &quot;recuperarlas&quot; con nuevas apuestas.</li>
          <li>Escondes tu actividad a familia, pareja o amistades.</li>
          <li>El tiempo dedicado interfiere con estudios, trabajo o salud.</li>
          <li>Piensas en ello incluso cuando no estás jugando.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>4. Recursos de ayuda en España</h2>
        <p>
          Si el juego te está causando problemas a ti o a alguien de tu entorno, existen
          recursos gratuitos y confidenciales:
        </p>
        <ul>
          <li>
            <b>Jugar Bien</b> — información oficial de la DGOJ:{' '}
            <a href="https://www.jugarbien.es" target="_blank" rel="noopener noreferrer">
              jugarbien.es
            </a>
          </li>
          <li>
            <b>Teléfono gratuito 24h de la DGOJ:</b>{' '}
            <a href="tel:900810011">900 810 011</a>
          </li>
          <li>
            <b>FEJAR</b> (Federación Española de Jugadores de Azar Rehabilitados):{' '}
            <a href="https://www.fejar.org" target="_blank" rel="noopener noreferrer">
              fejar.org
            </a>
          </li>
          <li>
            <b>Registro General de Interdicciones de Acceso al Juego (RGIAJ):</b> autoexclusión
            estatal para operadores regulados por la DGOJ.{' '}
            <a
              href="https://www.ordenacionjuego.es/es/rgiaj"
              target="_blank"
              rel="noopener noreferrer"
            >
              ordenacionjuego.es/rgiaj
            </a>
          </li>
        </ul>
        <p>
          <em>
            Si conoces recursos equivalentes en otro país donde reside la persona afectada,
            escríbenos y los añadimos.
          </em>
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>5. Autoexclusión de nuestra plataforma</h2>
        <p>
          Si quieres dejar de usar SocialPro Giveaways de forma inmediata:
        </p>
        <ul>
          <li>Cierra sesión desde el menú del pill de usuario.</li>
          <li>
            Escríbenos a{' '}
            <a href="mailto:info@socialpro.es">info@socialpro.es</a> con el asunto{' '}
            <code>Autoexclusión</code>. Bloqueamos la cuenta y eliminamos los datos personales
            que no estemos obligados a conservar por ley.
          </li>
        </ul>
        <p>
          <em>
            La autoexclusión de partners externos como KeyDrop debe solicitarse directamente
            ante ellos; SocialPro no puede ejecutarla en tu nombre.
          </em>
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>6. Protección de menores</h2>
        <p>
          La plataforma está reservada a mayores de 18 años. Si eres padre, madre o tutor y
          crees que un menor ha creado una cuenta, escríbenos a{' '}
          <a href="mailto:info@socialpro.es">info@socialpro.es</a>. Bloqueamos la
          cuenta y eliminamos los datos asociados en cuanto lo verifiquemos.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>7. Publicidad responsable</h2>
        <p>
          Cuando el CTA de un sorteo enlaza a un partner externo, lo indicamos con el nombre
          del partner y el código promocional del creador. No ocultamos que ese enlace forma
          parte del programa de afiliación del creador con el partner.
        </p>
        <p>
          Nos comprometemos a alinearnos con las buenas prácticas y principios aplicables en
          materia de comunicación comercial, protección de usuarios y juego responsable
          cuando resulten aplicables, sin perjuicio de la revisión legal definitiva de este
          documento.
        </p>
        <p>
          Ver también <Link href="/sorteos/terminos">Términos de uso</Link> y{' '}
          <Link href="/sorteos/privacidad">Política de privacidad</Link>.
        </p>
      </section>
    </>
  );
}
