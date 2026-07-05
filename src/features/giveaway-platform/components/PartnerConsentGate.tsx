import Link from 'next/link';
import { PartnerConsentModalTrigger } from './PartnerConsentModal';

interface Props {
  /** Nombres de los partners que aparecerían tras aceptar. Se muestran como logos/lista. */
  readonly partnerLabels: readonly string[];
  /** True si el usuario ya inició sesión con Steam. False → primer paso es login. */
  readonly isLoggedIn: boolean;
}

/**
 * Placeholder que sustituye a las `BrandCard*` de partners externos cuando
 * el usuario no ha aceptado el consent explícito.
 *
 * Dos estados:
 *   1. `isLoggedIn=false` → CTA para iniciar sesión con Steam. Sin modal
 *      (no tiene sentido pedir consent antes de identificar al usuario).
 *   2. `isLoggedIn=true` → CTA que abre `PartnerConsentModal`.
 *
 * Justificación legal: la comunicación comercial de partners externos
 * (algunos con operativa que puede encajar como juego) solo se muestra
 * tras consentimiento activo del usuario + confirmación +18. Ver
 * docs/legal-risk-matrix.md.
 *
 * @kind server
 * @feature giveaway-platform
 */
export function PartnerConsentGate({ partnerLabels, isLoggedIn }: Props): React.JSX.Element {
  return (
    <section
      aria-label="Ofertas de partners externos — requiere confirmación"
      style={{
        margin:       '0 0 24px 0',
        padding:      '28px 22px',
        borderRadius: '18px',
        border:       '1px solid rgba(255,255,255,0.08)',
        background:   'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      }}
    >
      <p
        style={{
          textTransform:  'uppercase',
          letterSpacing:  '0.24em',
          fontSize:       '11px',
          fontWeight:     700,
          color:          'rgba(245,99,42,0.85)',
          margin:         '0 0 10px 0',
        }}
      >
        Ofertas de partners externos
      </p>
      <h3
        style={{
          fontSize:   '20px',
          fontWeight: 800,
          margin:     '0 0 12px 0',
          color:      'rgba(255,255,255,0.92)',
        }}
      >
        {isLoggedIn
          ? 'Confirma +18 y participación responsable para ver las ofertas'
          : 'Inicia sesión con Steam para ver las ofertas de partners'}
      </h3>
      <p
        style={{
          fontSize:   '13px',
          lineHeight: 1.55,
          margin:     '0 0 14px 0',
          color:      'rgba(255,255,255,0.65)',
        }}
      >
        Estos partners son plataformas externas (KeyDrop, SkinsMonkey y otros). Su operativa,
        promociones y condiciones son responsabilidad suya, no de SocialPro. Para mostrarte
        sus ofertas necesitamos confirmar que eres mayor de edad y que has leído nuestra
        página de{' '}
        <Link
          href="/sorteos/participacion-responsable"
          style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}
        >
          participación responsable
        </Link>
        .
      </p>

      {partnerLabels.length > 0 ? (
        <p
          style={{
            fontSize:      '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.35)',
            margin:        '0 0 20px 0',
          }}
        >
          Partners disponibles: {partnerLabels.join(' · ')}
        </p>
      ) : null}

      {isLoggedIn ? (
        <PartnerConsentModalTrigger />
      ) : (
        <a
          href="/api/auth/sign-in/steam"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '8px',
            padding:        '10px 18px',
            borderRadius:   '999px',
            border:         '1px solid rgba(255,255,255,0.16)',
            background:     'linear-gradient(135deg, rgba(245,99,42,0.85), rgba(139,58,173,0.85))',
            color:          '#fff',
            fontWeight:     700,
            fontSize:       '13px',
            letterSpacing:  '0.05em',
            textTransform:  'uppercase',
            textDecoration: 'none',
          }}
        >
          Iniciar sesión con Steam
        </a>
      )}
    </section>
  );
}
