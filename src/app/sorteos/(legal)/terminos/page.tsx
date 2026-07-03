import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos de uso · SocialPro Giveaways',
  description:
    'Condiciones de uso de la plataforma SocialPro Giveaways: elegibilidad, gratuidad, puntos internos, canjeos, partners externos y limitación de responsabilidad. Borrador.',
  alternates: { canonical: '/sorteos/terminos' },
  robots: { index: false, follow: false },
};

export default function TerminosPage() {
  return (
    <>
      <header className="gp-legal-header">
        <p className="gp-legal-eyebrow">SocialPro Giveaways</p>
        <h1>Términos de uso de la plataforma</h1>
        <p className="gp-legal-sub">
          Última actualización del borrador: julio 2026. Pendiente de revisión por asesoría
          jurídica. En caso de conflicto, prevalecerá la versión validada.
        </p>
      </header>

      <section className="gp-legal-section">
        <h2>1. Objeto</h2>
        <p>
          Estos términos regulan el uso de la plataforma <b>SocialPro Giveaways</b>, disponible en{' '}
          <code>/sorteos</code>, operada por SocialPro. La plataforma permite a los
          usuarios participar gratuitamente en sorteos publicados por creadores de contenido
          asociados a la agencia, acumular puntos internos sin valor monetario (⭐) y canjearlos
          por recompensas del catálogo interno.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>2. Aceptación</h2>
        <p>
          Al iniciar sesión con Steam y usar la plataforma, aceptas estos términos, la{' '}
          <Link href="/sorteos/privacidad">política de privacidad</Link> y las normas de{' '}
          <Link href="/sorteos/juego-responsable">juego responsable</Link>. Si no estás de acuerdo,
          no uses el servicio.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>3. Elegibilidad</h2>
        <ul>
          <li>Debes tener <b>18 años o más</b>.</li>
          <li>Debes ser titular legítimo de la cuenta de Steam que utilizas.</li>
          <li>No debes residir en jurisdicciones donde estos sorteos gratuitos con premios en
              artículos digitales o físicos estén prohibidos.</li>
          <li>Solo se admite <b>una cuenta por persona</b>.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>4. Gratuidad</h2>
        <p>
          La participación en los sorteos internos es <b>gratuita</b>. La plataforma no acepta
          depósitos económicos, no cobra comisiones y no ofrece verificación ni activación de
          depósitos en su interior. Cualquier interacción económica que pueda existir con
          partners externos (por ejemplo, KeyDrop) ocurre <b>fuera</b> de nuestra plataforma y
          se rige por los términos del partner.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>5. Puntos SocialPro (⭐)</h2>
        <ul>
          <li>
            Los puntos son un sistema interno de fidelización y recompensas dentro de SocialPro
            Giveaways. <b>No son dinero, no son criptomonedas, no tienen valor monetario, no son
            transferibles y no pueden canjearse por efectivo.</b>
          </li>
          <li>Se obtienen participando en sorteos, completando misiones o manteniendo la racha
              diaria. No se compran.</li>
          <li>Se gastan canjeando recompensas del catálogo interno.</li>
          <li>No son transferibles entre cuentas ni entre usuarios.</li>
          <li>
            SocialPro podrá revisar, suspender temporalmente o corregir saldos cuando
            existan indicios razonables de error técnico, uso indebido o incumplimiento de
            estos términos. Cuando sea posible, se informará al usuario y se le permitirá
            aportar información adicional antes de una decisión definitiva. Toda corrección
            queda reflejada en el registro de transacciones.
          </li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>6. Canjeo de recompensas</h2>
        <p>
          El canjeo descuenta puntos del saldo y genera una solicitud de entrega. SocialPro
          coordinará contigo la entrega según el tipo de artículo (skin CS2 vía trade offer,
          merchandising físico o tarjeta regalo digital). Una vez procesado o entregado un
          canje puede no ser posible cancelarlo. Lo anterior se aplicará <b>sin perjuicio de
          los derechos que correspondan al usuario</b> según la normativa de consumidores y
          las excepciones aplicables, especialmente en productos digitales, códigos o
          artículos ya entregados. La disponibilidad de cada artículo depende del stock.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>7. Partners externos</h2>
        <p>
          Algunos creadores tienen partnerships con plataformas externas. Cuando el CTA de un
          sorteo abre una URL de partner (por ejemplo, <code>kd.link</code>):
        </p>
        <ul>
          <li>Estás saliendo de SocialPro Giveaways.</li>
          <li>La participación, requisitos, entrega del premio y protección de datos pasan a
              regirse por los términos del partner.</li>
          <li>Es posible que el enlace lleve un código promocional del creador asociado a un
              programa de afiliados.</li>
          <li>SocialPro no responde por el funcionamiento, la disponibilidad ni las decisiones
              del partner externo.</li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>8. Conducta prohibida</h2>
        <ul>
          <li>Crear varias cuentas para el mismo participante.</li>
          <li>Usar bots o automatismos para acumular puntos o participaciones.</li>
          <li>Suplantar la identidad de otra persona o creador.</li>
          <li>Intentar vulnerar la seguridad de la plataforma, sus proveedores o los partners.</li>
          <li>
            Publicar o transmitir contenido ilícito, difamatorio o que vulnere derechos de
            terceros a través de nombres de usuario, mensajes o cualquier canal.
          </li>
        </ul>
        <p>
          El incumplimiento puede resultar en suspensión de la cuenta, anulación de canjeos
          pendientes y ajuste del saldo, sin perjuicio de otras acciones legales.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>9. Modificaciones y disponibilidad</h2>
        <p>
          Podemos actualizar estos términos, la mecánica de puntos, el catálogo de recompensas o
          la lista de creadores participantes en cualquier momento. Los cambios sustanciales se
          comunicarán desde la propia plataforma con antelación razonable. No garantizamos la
          disponibilidad continua del servicio; podemos suspenderlo temporalmente por
          mantenimiento o incidencias.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>10. Limitación de responsabilidad</h2>
        <p>
          Dentro de los límites permitidos por la ley aplicable, SocialPro no responde por
          pérdidas indirectas, lucro cesante ni por incidencias derivadas de partners externos,
          de la red de Steam o de tu proveedor de acceso a Internet. Los premios en formato de
          skins CS2 dependen de que Steam permita el intercambio en el momento del canje;
          bloqueos o restricciones de trade impuestos por Steam quedan fuera de nuestro control.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>11. Ley y jurisdicción</h2>
        <p>
          <em>
            Sección pendiente de definición por asesoría jurídica. La versión validada
            especificará la ley aplicable y los tribunales competentes. Hasta entonces, este
            documento no puede interpretarse como sometimiento a una jurisdicción concreta.
          </em>
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>12. Contacto</h2>
        <p>
          Para dudas sobre estos términos:{' '}
          <a href="mailto:info@socialpro.es">info@socialpro.es</a>.
        </p>
      </section>
    </>
  );
}
