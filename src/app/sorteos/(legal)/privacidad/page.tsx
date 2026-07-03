import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de privacidad · SocialPro Giveaways',
  description:
    'Política de privacidad de la plataforma SocialPro Giveaways: qué datos guardamos, cómo los tratamos, con quién los compartimos y cómo ejerces tus derechos. Borrador.',
  alternates: { canonical: '/sorteos/privacidad' },
  robots: { index: false, follow: false },
};

export default function PrivacidadPage() {
  return (
    <>
      <header className="gp-legal-header">
        <p className="gp-legal-eyebrow">SocialPro Giveaways</p>
        <h1>Política de privacidad</h1>
        <p className="gp-legal-sub">
          Última actualización del borrador: julio 2026. Redactado por producto, pendiente de
          revisión por asesoría jurídica.
        </p>
      </header>

      <section className="gp-legal-section">
        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de datos personales derivados del uso de la plataforma
          de sorteos SocialPro Giveaways es <b>SocialPro</b>, la entidad que opera el dominio
          en el que se aloja la plataforma. Los datos de contacto y de identificación fiscal
          definitivos se incorporarán en la versión validada de este documento.
        </p>
        <p>
          Cualquier consulta sobre esta política se dirige a{' '}
          <a href="mailto:info@socialpro.es">info@socialpro.es</a>.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>2. Datos que tratamos</h2>
        <p>
          Solo tratamos los datos estrictamente necesarios para que la plataforma funcione.
          Categorías:
        </p>
        <ul>
          <li>
            <b>Identidad Steam pública:</b> Steam ID (número), nombre de perfil público, avatar
            de perfil público, URL de trade si el usuario la introduce voluntariamente.
          </li>
          <li>
            <b>Datos de participación en la plataforma:</b> sorteos en los que participas,
            historial de puntos ⭐, misiones completadas, racha diaria, canjeos en tienda.
          </li>
          <li>
            <b>Datos de sesión:</b> cookies estrictamente necesarias para mantener la sesión
            iniciada. No usamos cookies publicitarias en esta sección.
          </li>
          <li>
            <b>Datos de contacto opcionales:</b> si el canjeo requiere envío físico, se pedirá
            una dirección postal exclusivamente para ese envío. Se elimina tras la entrega.
          </li>
        </ul>
        <p>
          <b>No tratamos:</b> tarjetas de crédito, contraseñas (Steam OpenID no las expone),
          documentos de identidad ni ningún dato sensible en el sentido del artículo 9 RGPD.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>3. Base jurídica del tratamiento</h2>
        <p>
          El tratamiento se apoya en las siguientes bases jurídicas del artículo 6 RGPD:
        </p>
        <ul>
          <li>
            <b>Ejecución del servicio (art. 6.1.b):</b> gestión de tu cuenta, participaciones,
            saldo de puntos y canjeos.
          </li>
          <li>
            <b>Consentimiento (art. 6.1.a):</b> para funcionalidades opcionales (vincular tu
            usuario de Kick, hacer tu perfil público, guardar tu URL de trade).
          </li>
          <li>
            <b>Interés legítimo (art. 6.1.f):</b> aplicar medidas para prevenir abusos o
            uso indebido, revisar posibles incumplimientos y auditar el registro interno de
            puntos.
          </li>
        </ul>
        <p>
          El ranking global de la plataforma puede mostrarse con el nombre público del
          usuario salvo que active el modo privado disponible en su perfil, que enmascara
          el nombre en el listado. Esta base jurídica y su configuración quedan pendientes
          de revisión legal definitiva.
        </p>
        <p>
          <em>
            El resto de esta sección también está pendiente de validación por asesoría
            jurídica; puede completarse con otras bases si el análisis final lo justifica.
          </em>
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>4. Con quién los compartimos</h2>
        <p>Solo compartimos datos cuando es imprescindible:</p>
        <ul>
          <li>
            <b>Steam (Valve Corporation):</b> intercambio OpenID de identidad. No enviamos
            nada distinto de lo que necesita el protocolo.
          </li>
          <li>
            <b>Proveedores de infraestructura</b> (Vercel para hosting, Neon para base de
            datos, Resend para email transaccional). Actúan como proveedores técnicos que
            operan como encargados del tratamiento, sujetos al RGPD y a los términos,
            acuerdos de tratamiento o condiciones de privacidad que cada proveedor
            publique o ponga a disposición.
          </li>
          <li>
            <b>Partners externos de sorteos</b> (KeyDrop y equivalentes): NO les enviamos tu
            Steam ID ni datos personales desde la plataforma. Si decides participar en su
            plataforma, la relación de datos allí es directa entre tú y el partner, bajo su
            propia política.
          </li>
          <li>
            <b>Autoridades competentes</b> cuando exista requerimiento legal.
          </li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>5. Transferencias internacionales</h2>
        <p>
          Algunos proveedores pueden almacenar datos en servidores fuera del Espacio Económico
          Europeo. En esos casos aplicamos las garantías previstas por el RGPD (Cláusulas
          Contractuales Tipo aprobadas por la Comisión). Steam (Valve) opera globalmente.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>6. Conservación</h2>
        <ul>
          <li>Datos de cuenta: mientras la cuenta permanezca activa.</li>
          <li>
            Historial de puntos y canjeos: durante el plazo estrictamente necesario
            para gestionar la cuenta, resolver incidencias, prevenir abusos y cumplir,
            en su caso, con las obligaciones legales aplicables.
          </li>
          <li>Dirección de envío tras canjeo físico: se elimina al confirmar la recepción.</li>
          <li>
            Al solicitar la eliminación de tu cuenta, borramos los datos que no estemos
            obligados a conservar por ley.
          </li>
        </ul>
      </section>

      <section className="gp-legal-section">
        <h2>7. Tus derechos</h2>
        <p>
          Puedes ejercer en cualquier momento los derechos de acceso, rectificación, supresión,
          oposición, portabilidad y limitación previstos por el RGPD y la LOPDGDD, escribiendo a{' '}
          <a href="mailto:info@socialpro.es">info@socialpro.es</a> desde el email
          asociado a tu Steam. Puedes revisar tus datos en tu perfil de{' '}
          <Link href="/sorteos">SocialPro Giveaways</Link>.
        </p>
        <p>
          También puedes reclamar ante la <b>Agencia Española de Protección de Datos</b> si
          consideras que hemos gestionado incorrectamente tus datos.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>8. Cookies</h2>
        <p>
          Usamos las cookies mínimas para mantener la sesión iniciada (Better Auth) y para
          proteger la plataforma (state de OpenID, CSRF). No usamos cookies de perfilado
          publicitario en esta sección de la web. Cualquier cookie de analítica se declarará
          explícitamente en la versión firmada de este documento.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>9. Menores</h2>
        <p>
          La plataforma está reservada a mayores de 18 años. Si tenemos conocimiento
          razonable de una cuenta que incumple este requisito, la eliminaremos junto con
          los datos asociados.
        </p>
      </section>

      <section className="gp-legal-section">
        <h2>10. Actualizaciones</h2>
        <p>
          Podemos actualizar esta política. Los cambios se publicarán en esta misma URL con la
          fecha de actualización. Cambios sustanciales se comunicarán además desde la propia
          plataforma. Ver también{' '}
          <Link href="/sorteos/terminos">Términos de uso</Link> y{' '}
          <Link href="/sorteos/juego-responsable">Juego responsable</Link>.
        </p>
      </section>
    </>
  );
}
