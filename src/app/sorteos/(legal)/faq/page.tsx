import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ · SocialPro Giveaways',
  description:
    'Preguntas frecuentes sobre la plataforma de sorteos gratuitos de SocialPro: cómo participar, monedas, canjeo, providers externos y Steam login. Borrador.',
  alternates: { canonical: '/sorteos/faq' },
  robots: { index: false, follow: false },
};

interface QA {
  q: string;
  a: React.ReactNode;
}

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: 'Sobre la plataforma',
    items: [
      {
        q: '¿Qué es SocialPro Giveaways?',
        a: (
          <p>
            SocialPro Giveaways es una plataforma web operada por SocialPro donde los creadores de
            contenido asociados a la agencia publican sorteos <b>gratuitos</b> dirigidos a su
            comunidad. Los participantes ganan tickets sin coste y pueden acumular monedas
            virtuales (🪙) que se canjean por objetos físicos, digitales o tarjetas regalo en la
            tienda interna. La plataforma no acepta ni gestiona dinero real de los participantes.
          </p>
        ),
      },
      {
        q: '¿Es gratis participar?',
        a: (
          <p>
            Sí. Los sorteos internos de la plataforma son <b>siempre gratuitos</b>: solo hace
            falta iniciar sesión con Steam y pulsar el botón de participación de cada sorteo.
            No pedimos tarjeta, no aceptamos depósitos y no cobramos comisiones. Algunos sorteos
            de partners externos (por ejemplo, KeyDrop) requieren registro en su plataforma y
            se rigen por sus propios términos, que aparecen enlazados en cada card.
          </p>
        ),
      },
      {
        q: '¿Quién puede participar?',
        a: (
          <p>
            Mayores de 18 años con una cuenta de Steam activa. Al iniciar sesión declaras que
            cumples la edad mínima. Solo se admite una cuenta por persona; nos reservamos el
            derecho a suspender cuentas que incumplan estos términos. Los residentes en
            jurisdicciones donde los sorteos gratuitos con componente promocional no estén
            permitidos deben abstenerse.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Cómo participar',
    items: [
      {
        q: '¿Cómo participo en un sorteo?',
        a: (
          <ol>
            <li>Entras en <code>/sorteos</code>.</li>
            <li>Pulsas &quot;Iniciar sesión con Steam&quot; y confirmas en steamcommunity.com.</li>
            <li>Eliges un creador desde el selector superior.</li>
            <li>Pulsas &quot;Participar&quot; en cualquier sorteo activo.</li>
          </ol>
        ),
      },
      {
        q: '¿Por qué me pedís login con Steam?',
        a: (
          <p>
            Steam es la fuente única de identidad de la plataforma. Usar OpenID nos permite
            identificar a cada participante sin pedir email, contraseña ni datos personales
            innecesarios. Solo guardamos tu Steam ID, tu nombre público y tu avatar público
            (los datos que ya son visibles en tu perfil Steam).
          </p>
        ),
      },
      {
        q: '¿Qué es una racha diaria?',
        a: (
          <p>
            Es una recompensa diaria de 🪙 que puedes reclamar una vez cada 24 horas si mantienes
            el login diario. Si te saltas un día, la racha se reinicia al día 1. Es solo un bono
            de fidelidad, no una obligación.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Monedas y tienda',
    items: [
      {
        q: '¿Qué son las monedas 🪙?',
        a: (
          <p>
            Son puntos internos, sin valor monetario y sin capacidad de conversión a euros o
            cualquier moneda de curso legal. Se ganan participando, completando misiones o
            manteniendo la racha diaria. Se gastan canjeando premios en la tienda. No se pueden
            comprar, transferir entre cuentas ni retirar.
          </p>
        ),
      },
      {
        q: '¿Cómo canjeo un premio?',
        a: (
          <p>
            En <code>/sorteos#tienda</code> eliges un artículo cuyo coste sea igual o
            menor que tu saldo. Al pulsar &quot;Canjear&quot; se descuentan las monedas y el
            equipo de SocialPro contacta contigo para coordinar el envío o la entrega digital,
            según el tipo de artículo. Una vez procesado o entregado un canje puede no ser
            posible cancelarlo, sin perjuicio de los derechos que correspondan al usuario según
            la normativa de consumidores y las excepciones aplicables, especialmente en
            productos digitales, códigos o artículos ya entregados.
          </p>
        ),
      },
      {
        q: '¿Puedo perder monedas?',
        a: (
          <p>
            Solo si canjeas (gasto voluntario) o si tu cuenta es suspendida por incumplir
            estos términos (por ejemplo, uso indebido o bots). Nos reservamos el derecho a
            revisar posibles incumplimientos y aplicar medidas para prevenir abusos, siempre
            dejando constancia en el registro de transacciones. No hay caducidad automática
            de saldo hoy; si en el futuro la incorporamos, se anunciará con antelación
            suficiente.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Partners externos',
    items: [
      {
        q: '¿Qué son los sorteos KeyDrop / partners?',
        a: (
          <p>
            Algunos creadores tienen partnerships con plataformas externas (KeyDrop, entre otras).
            Cuando un creador está bindado a un partner, la plataforma lee sus sorteos en vivo
            desde la API pública del partner y los muestra como una sección informativa. Al
            pulsar el CTA se abre la web del partner con el código promocional del creador
            aplicado. La participación, sus términos y la entrega del premio son responsabilidad
            del partner externo, no de SocialPro.
          </p>
        ),
      },
      {
        q: '¿SocialPro se lleva algo si uso el código del creador?',
        a: (
          <p>
            Los creadores mantienen su acuerdo affiliate directo con el partner. SocialPro
            actúa como agencia gestora del creador. No ocultamos ese vínculo: si pulsas
            &quot;Ver en KeyDrop&quot;, estás abriendo un enlace de afiliado del creador.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Cuenta y privacidad',
    items: [
      {
        q: '¿Qué datos guardáis de mí?',
        a: (
          <p>
            Steam ID, nombre público de Steam, avatar público de Steam, participaciones en
            sorteos, transacciones de monedas, misiones completadas y canjeos. Detalle completo
            en <Link href="/sorteos/privacidad">/sorteos/privacidad</Link>.
          </p>
        ),
      },
      {
        q: '¿Puedo hacer mi perfil privado?',
        a: (
          <p>
            Sí. En <code>/sorteos/perfil</code> puedes marcar el toggle
            &quot;Perfil privado&quot;. Cuando está activo, tu nombre aparece enmascarado en el
            ranking global (por ejemplo, <code>k*****</code>).
          </p>
        ),
      },
      {
        q: '¿Cómo cierro sesión o borro mi cuenta?',
        a: (
          <p>
            Puedes cerrar sesión desde el menú del usuario en la esquina superior derecha. Para
            eliminar tu cuenta y datos asociados, escríbenos a{' '}
            <a href="mailto:info@socialpro.es">info@socialpro.es</a> desde el email
            asociado a tu perfil de Steam.
          </p>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <header className="gp-legal-header">
        <p className="gp-legal-eyebrow">SocialPro Giveaways</p>
        <h1>Preguntas frecuentes</h1>
        <p className="gp-legal-sub">
          Todo lo que necesitas saber sobre la plataforma. Si tu duda no está aquí,
          escríbenos a <a href="mailto:info@socialpro.es">info@socialpro.es</a>.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="gp-legal-section">
          <h2>{section.title}</h2>
          <div className="gp-legal-qa-list">
            {section.items.map((item) => (
              <details key={item.q} className="gp-legal-qa">
                <summary>{item.q}</summary>
                <div className="gp-legal-qa-body">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
