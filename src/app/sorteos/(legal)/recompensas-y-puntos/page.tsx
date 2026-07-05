import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Recompensas y puntos · SocialPro Giveaways',
  description:
    'Cómo funcionan los puntos internos ⭐ y las recompensas en SocialPro Giveaways: fuentes válidas, catálogo, canje fijo, límites y controles antifraude. Borrador.',
  alternates: { canonical: '/sorteos/recompensas-y-puntos' },
  robots: { index: false, follow: false },
};

export default function RecompensasYPuntosPage() {
  return (
    <>
      <header className="gp-legal-header">
        <p className="gp-legal-eyebrow">SocialPro Giveaways</p>
        <h1>Recompensas y puntos</h1>
        <p className="gp-legal-sub">
          Última actualización del borrador: julio 2026. Este documento resume las reglas
          del sistema de puntos y recompensas — es el complemento operativo de los{' '}
          <Link href="/sorteos/terminos">términos</Link>. Ver también{' '}
          <Link href="/sorteos/partners-externos">partners externos</Link> y{' '}
          <Link href="/sorteos/participacion-responsable">participación responsable</Link>.
        </p>
      </header>

      <section className="gp-legal-section">
        <h2>1. Qué son los puntos ⭐</h2>
        <p>
          Los puntos internos de SocialPro Giveaways son una <b>recompensa interna sin valor
          monetario</b> que se acumula al realizar acciones objetivas dentro de la plataforma
          (login diario, misiones verificadas, participación en sorteos gratuitos). No son
          divisa, no representan derechos económicos y no pueden convertirse en dinero.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>2. Reglas del sistema (invariantes)</h2>
        <ul>
          <li>Los puntos <b>no se compran</b>, no se transfieren entre usuarios y no se venden.</li>
          <li>Los puntos <b>no se pierden</b> por azar ni por decisión unilateral fuera de los supuestos de fraude.</li>
          <li>Los puntos <b>no se multiplican</b> por azar.</li>
          <li>Los puntos solo se obtienen por <b>acciones objetivas verificables</b>.</li>
          <li>Las recompensas tienen <b>coste fijo</b>, publicado en la tienda.</li>
          <li>Los sorteos internos son <b>gratuitos</b> — no se pagan con puntos.</li>
          <li>Los partners externos <b>no modifican</b> el saldo interno de SocialPro.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>3. Fuentes de puntos permitidas</h2>
        <p>Actualmente los puntos solo pueden generarse por estas fuentes:</p>
        <ul>
          <li><b>Racha diaria</b>: login diario (streak).</li>
          <li><b>Misiones</b>: acciones verificables como seguir a un creador en una red social vinculada o unirse a un servidor Discord del creador.</li>
          <li><b>Participación en sorteos internos</b>: bonificación al participar (una vez por sorteo).</li>
          <li><b>Ajustes administrativos</b>: correcciones registradas por el equipo de SocialPro con motivo documentado.</li>
        </ul>
        {/* @allow-sensitive-copy: enumera fuentes vetadas — necesita citarlas para explicar el guardrail */}
        <p>
          Cualquier otra fuente hipotética (apuesta, ruleta, jackpot, multiplicador, caja aleatoria,
          upgrade, batalla de cajas, depósito en partner externo) está <b>vetada por diseño</b>. La
          plataforma incluye un guard técnico que impide la inserción de fuentes no autorizadas.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>4. Catálogo de recompensas</h2>
        <p>El catálogo actual incluye tres tipos de recompensa, todas con coste fijo y stock limitado:</p>
        <ul>
          <li><b>Skins CS2</b> — canje directo o premio de sorteo gratuito. Requiere Steam Trade URL válida.</li>
          <li><b>Tarjetas regalo</b> (Riot / Steam / PSN) — canje directo con límite por usuario y mes.</li>
          <li><b>Merchandising</b> — camisetas y merch de equipos, envío revisado manualmente.</li>
        </ul>
        <p>
          Puede haber recompensas cosméticas (badges) sin valor económico que se otorgan por hitos
          de participación.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>5. Canje y entrega</h2>
        <p>
          El canje descuenta el coste fijo del saldo del usuario y crea una orden de entrega en
          estado <code>pendiente</code>. Todas las órdenes están sujetas a <b>revisión manual</b> antes
          de enviarse, en un plazo orientativo de:
        </p>
        <ul>
          <li>Tarjetas regalo digitales: hasta 24h.</li>
          <li>Skins CS2: hasta 48h y sujeto a Trade URL válida y estado positivo de la cuenta Steam.</li>
          <li>Merchandising físico: 7-14 días laborables desde la verificación del pedido.</li>
        </ul>
        <p>
          Si detectamos indicios de multi-cuenta, fraude o incumplimiento de estos términos, la
          orden puede rechazarse y el usuario recibirá el motivo por email registrado.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>6. Controles</h2>
        <ul>
          <li><b>+18</b>. La plataforma no está disponible para menores.</li>
          <li>Verificación de identidad Steam para skins y ajustes fiscales cuando aplique.</li>
          <li>Log de entrega con fecha, valor de referencia y trade URL utilizada.</li>
          <li>Límites por usuario/mes en categorías con valor económico.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>7. Fiscalidad</h2>
        <p>
          Los premios en especie pueden estar sujetos a obligaciones fiscales para el organizador
          o para el ganador según normativa vigente. En caso de superar los umbrales aplicables,
          SocialPro solicitará los datos necesarios para cumplir con las obligaciones y
          comunicará al ganador el detalle correspondiente antes de la entrega.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>8. Cambios</h2>
        <p>
          Estas reglas pueden actualizarse para reflejar cambios en el catálogo, en la operativa
          o en la normativa aplicable. Cualquier modificación se publicará aquí con nueva fecha de
          actualización y se comunicará por los canales habituales de la plataforma.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>9. Contacto</h2>
        <p>
          Para dudas sobre puntos, canjes o entregas, escribe a{' '}
          <a href="mailto:info@socialpro.es">info@socialpro.es</a>.
        </p>
      </section>
    </>
  );
}
