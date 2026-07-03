/**
 * Banner "borrador pendiente de revisión legal" que aparece encima de cada
 * página legal de la plataforma de sorteos. Objetivo: dejar meridianamente
 * claro tanto al usuario final como a un futuro auditor que el texto NO
 * está validado por abogado/gestoría y no debe interpretarse como
 * documento vinculante en su forma actual.
 *
 * `role="note"` + copy explícito para SR.
 */
export function LegalDraftBanner() {
  return (
    <aside className="gp-legal-draft" role="note" aria-label="Aviso: documento en borrador">
      <span className="gp-legal-draft-tag">Borrador</span>
      <span className="gp-legal-draft-body">
        <b>Documento pendiente de revisión legal.</b>
        <span>
          Este texto es un borrador de trabajo redactado por el equipo de producto de SocialPro
          para acompañar la plataforma en pruebas. No ha sido validado por asesoría jurídica y
          no debe considerarse un documento vinculante en su forma actual. Se sustituirá por la
          versión firmada por gestoría antes de la salida pública.
        </span>
      </span>
    </aside>
  );
}
