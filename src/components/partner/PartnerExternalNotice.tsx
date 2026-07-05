import Link from 'next/link';

interface Props {
  /** Nombre visible del partner. Ej: "KeyDrop", "SkinsMonkey". */
  readonly partner: string;
  /**
   * Categoría del partner — determina el matiz del disclaimer.
   * - `skin_market`: mercado de skins (compra/venta/trade).
   * - `casino_like`: operativa que puede encajar como juego (case opening, upgrader, jackpot).
   *   Con este valor el disclaimer añade la advertencia "+18" y "juega con responsabilidad".
   * - `informational`: mera información, sin CTA de conversión.
   */
  readonly category?: 'skin_market' | 'casino_like' | 'informational';
  /** ID opcional para tests / accesibilidad. */
  readonly id?: string;
}

/**
 * Aviso obligatorio encima de cualquier card externa (KeyDrop,
 * SkinsMonkey, Csgoskins, Skin.Club, etc.) para dejar claro que la
 * operativa es del partner y SocialPro no la gestiona.
 *
 * Requisito de `docs/external-partners.md` y `docs/legal-risk-matrix.md`
 * (R1). Se debe renderizar independientemente del país detectado.
 *
 * @kind server
 * @feature partner
 */
export function PartnerExternalNotice({
  partner,
  category = 'skin_market',
  id,
}: Props): React.JSX.Element {
  const casinoLike = category === 'casino_like';
  return (
    <div
      id={id}
      role="note"
      aria-label={`Aviso — ${partner} es una plataforma externa`}
      className="sp-partner-external-notice"
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            '10px',
        margin:         '0 0 12px 0',
        padding:        '10px 14px',
        borderRadius:   '10px',
        border:         '1px solid rgba(255,255,255,0.12)',
        background:     'rgba(255,255,255,0.03)',
        fontSize:       '12px',
        lineHeight:     '1.5',
        color:          'rgba(255,255,255,0.70)',
      }}
    >
      <span aria-hidden style={{ fontSize: '14px', lineHeight: 1 }}>↗</span>
      <div>
        <b style={{ color: 'rgba(255,255,255,0.92)' }}>{partner} es una plataforma externa.</b>{' '}
        Al hacer clic sales de SocialPro y aceptas los términos de {partner}. SocialPro no
        participa en su operativa, no gestiona premios ni disputas de esa plataforma y no
        se responsabiliza de bonos, promociones ni comisiones que ofrezcan.
        {casinoLike ? (
          <>
            {' '}Solo mayores de <b>18 años</b>. Participa con responsabilidad —{' '}
            <Link
              href="/sorteos/participacion-responsable"
              className="sp-partner-external-notice-link"
              style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}
            >
              información sobre participación responsable
            </Link>
            .
          </>
        ) : null}
      </div>
    </div>
  );
}
