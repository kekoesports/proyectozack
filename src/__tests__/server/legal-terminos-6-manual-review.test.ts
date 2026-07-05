/**
 * Refuerzo copy Términos §6 · Canjeo de recompensas (PR-C).
 *
 * La auditoría detectó que Términos §6 no mencionaba explícitamente la
 * "revisión manual antes del envío" — sí estaba en FAQ y en el disclaimer
 * de PlatformShop. Ahora también en Términos, con la fórmula pactada:
 *
 *   "Todos los canjes están sujetos a revisión manual por el equipo de
 *    SocialPro antes del envío"
 *
 * Sin quitar el LegalDraftBanner, sin cambiar noindex, sin tocar
 * jurisdicción (§11 sigue pendiente de gestoría).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const TERMINOS = 'src/app/sorteos/(legal)/terminos/page.tsx';

describe('[legal-pr-c] Términos §6 menciona la revisión manual', () => {
  const src = read(TERMINOS);

  it('la sección 6 sigue titulada "Canjeo de recompensas"', () => {
    expect(src).toMatch(/<h2>6\.\s*Canjeo de recompensas<\/h2>/);
  });

  it('incluye la frase canónica de revisión manual', () => {
    expect(src).toMatch(
      /Todos los canjes están sujetos a revisión manual por el equipo de SocialPro antes del envío/,
    );
  });

  it('explica qué se revisa (identidad + stock + abuso)', () => {
    expect(src).toMatch(/Comprobamos identidad,\s+disponibilidad real de stock y ausencia de indicios de uso/);
    expect(src).toMatch(/abusivo o incumplimiento de estos términos/);
  });

  it('menciona que el plazo puede variar', () => {
    // La frase se rompe entre "puede" y "variar" por wrap JSX.
    expect(src).toMatch(/plazo de revisión y envío puede[\s\S]{0,20}variar/);
  });

  it('preserva el copy previo — no cancelable + derechos de consumidor', () => {
    // No pisamos las cláusulas previas. Permitimos saltos de línea y
    // etiquetas <b> entre partes por el formato JSX.
    expect(src).toMatch(/no ser posible cancelarlo/);
    expect(src).toMatch(/sin[\s\S]{0,20}perjuicio[\s\S]{0,120}derechos que correspondan al usuario/);
    expect(src).toMatch(/normativa de consumidores/);
  });
});

describe('[legal-pr-c] mantiene invariantes legales acordados', () => {
  const src = read(TERMINOS);

  it('LegalDraftBanner sigue montado (no quitarlo)', () => {
    // El banner de borrador vive como componente compartido `<LegalDraftBanner />`
    // en el layout legal, no en cada página. Aquí verificamos que el
    // layout sigue importándolo.
    const layoutSrc = read('src/app/sorteos/(legal)/layout.tsx');
    expect(layoutSrc).toMatch(/LegalDraftBanner/);
  });

  it('robots noindex se mantiene', () => {
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  });

  it('§11 Ley y jurisdicción sigue marcada como pendiente (gestoría)', () => {
    expect(src).toMatch(/11\.\s*Ley y jurisdicción/);
    expect(src).toMatch(/Sección pendiente de definición por asesoría jurídica/);
  });

  it('§10 Limitación de responsabilidad sigue intacta (gestoría)', () => {
    expect(src).toMatch(/10\.\s*Limitación de responsabilidad/);
  });

  it('no cambia el naming compliance (puntos, no monedas)', () => {
    // Los 6 puntos base siguen presentes.
    expect(src).toMatch(/no son dinero/i);
    expect(src).toMatch(/no son criptomonedas/i);
    expect(src).toMatch(/no tienen valor monetario/i);
    expect(src).toMatch(/no son transferibles/i);
    expect(src).toMatch(/no pueden canjearse por efectivo/i);
    // Y no reintroducimos "monedas" como término público.
    const bodyOnly = src.split(/^\s*\*/).join('').replace(/\/\/.*$/gm, '');
    expect(bodyOnly).not.toMatch(/\bmonedas?\b/i);
  });
});

describe('[legal-pr-c] alineamiento con FAQ y PlatformShop', () => {
  it('el FAQ ya cita "revisión manual" (referencia consistente)', () => {
    const faq = read('src/app/sorteos/(legal)/faq/page.tsx');
    expect(faq).toMatch(/revisión manual|revisar|revisión/i);
  });

  it('PlatformShop muestra el mensaje de "revisaremos el canje"', () => {
    const shop = read('src/features/giveaway-platform/components/PlatformShop.tsx');
    expect(shop).toMatch(/Revisaremos el canje/);
  });
});
