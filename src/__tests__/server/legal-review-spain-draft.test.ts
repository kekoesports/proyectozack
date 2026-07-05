/**
 * Contratos del borrador interno de revisión legal (draft).
 *
 * Verifica:
 *  - El documento existe en `docs/legal/`.
 *  - Está marcado explícitamente como borrador interno + no vinculante.
 *  - No se filtra a UI pública (las páginas legales NO importan sus textos).
 *  - Usa placeholders (no rellenados en el repo) para razón social/CIF/domicilio.
 *  - Cita fuentes oficiales (BOE, AEPD, DGOJ).
 *
 * Sin cambios de código de producción — el doc no debe alterar las 4
 * páginas legales ni el LegalDraftBanner.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const DOC = 'docs/legal/socialpro-giveaways-legal-review-spain.md';

describe('[legal-review-draft] el documento existe y no está vacío', () => {
  it('docs/legal/socialpro-giveaways-legal-review-spain.md existe', () => {
    const p = path.join(ROOT, DOC);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(6_000);
  });
});

describe('[legal-review-draft] marcado explícitamente como borrador interno', () => {
  const doc = read(DOC);

  it('lleva el marcador "Borrador interno"', () => {
    expect(doc).toMatch(/Borrador interno/i);
  });

  it('deja claro que NO es asesoramiento jurídico definitivo', () => {
    expect(doc).toMatch(/NO es asesoramiento jurídico definitivo/i);
  });

  it('advierte de no aplicar sin validación firmada', () => {
    expect(doc).toMatch(/No aplicar[\s\S]{0,50}sin validación firmada/i);
  });
});

describe('[legal-review-draft] estructura mínima (9 bloques del brief)', () => {
  const doc = read(DOC);

  it('§1 Resumen ejecutivo', () => {
    expect(doc).toMatch(/##\s*1\.\s*Resumen ejecutivo/);
  });
  it('§2 Riesgos principales', () => {
    expect(doc).toMatch(/##\s*2\.\s*Riesgos principales/);
  });
  it('§3 Recomendación conservadora', () => {
    expect(doc).toMatch(/##\s*3\.\s*Recomendación conservadora/);
  });
  it('§4 Texto propuesto §10 (limitación responsabilidad)', () => {
    expect(doc).toMatch(/##\s*4\.\s*Texto propuesto[\s\S]{0,80}§10[\s\S]{0,80}Limitación de responsabilidad/i);
  });
  it('§5 Texto propuesto §11 (ley y jurisdicción)', () => {
    expect(doc).toMatch(/##\s*5\.\s*Texto propuesto[\s\S]{0,80}§11[\s\S]{0,80}Ley aplicable y jurisdicción/i);
  });
  it('§6 Texto propuesto Privacidad §3 (ranking)', () => {
    expect(doc).toMatch(/##\s*6\.\s*Texto propuesto[\s\S]{0,120}[Rr]anking/);
  });
  it('§7 Checklist para publicar', () => {
    expect(doc).toMatch(/##\s*7\.\s*Checklist para publicar/i);
  });
  it('§8 Preguntas concretas para gestoría', () => {
    expect(doc).toMatch(/##\s*8\.\s*Preguntas concretas para gestoría/i);
  });
  it('§9 Cosas que NO debemos afirmar todavía', () => {
    expect(doc).toMatch(/##\s*9\.\s*Cosas que NO debemos afirmar todavía/i);
  });
});

describe('[legal-review-draft] usa placeholders — nada rellenado en repo', () => {
  const doc = read(DOC);

  it('deja placeholders explícitos para datos de identidad', () => {
    expect(doc).toContain('[RAZÓN SOCIAL]');
    expect(doc).toContain('[CIF]');
    expect(doc).toContain('[DOMICILIO SOCIAL]');
  });

  it('no filtra CIF, NIF o inscripciones registrales en formato literal', () => {
    // Formato CIF español: letra + 8 dígitos, o CIF de sociedad.
    expect(doc).not.toMatch(/\b[A-HJNP-SUVW]-?\d{7}[0-9A-J]\b/);
    // Números de Registro Mercantil hardcodeados.
    expect(doc).not.toMatch(/Tomo\s+\d+\s*,\s*Folio/);
  });
});

describe('[legal-review-draft] identifica el riesgo RD 958/2020', () => {
  const doc = read(DOC);

  it('cita el RD 958/2020 y su art. 6.2 (prohibición de comunicaciones sin título)', () => {
    expect(doc).toMatch(/RD\s*958\/2020|Real Decreto 958\/2020/);
    expect(doc).toMatch(/art\.\s*6\.2/);
    expect(doc).toMatch(/título habilitante/i);
  });

  it('identifica a los afiliados como sujetos obligados (art. 2)', () => {
    expect(doc).toMatch(/afiliados[\s\S]{0,200}sujetos obligados|art\.\s*2[\s\S]{0,200}afiliados/i);
  });

  it('menciona el DGOJ y su registro de operadores habilitados', () => {
    expect(doc).toMatch(/DGOJ|Dirección General de Ordenación del Juego/i);
    expect(doc).toMatch(/operadores habilitados|Registro de[\s\S]{0,60}Licencias/i);
  });
});

describe('[legal-review-draft] cita normas relevantes con enlace BOE', () => {
  const doc = read(DOC);

  it('enlaza a la Ley 13/2011', () => {
    expect(doc).toMatch(/boe\.es[\s\S]{0,80}(BOE-A-2011-9280|id=BOE-A-2011-9280)/);
  });
  it('enlaza al TRLGDCU (RDL 1/2007)', () => {
    expect(doc).toMatch(/boe\.es[\s\S]{0,80}(BOE-A-2007-20555|RDL\s*1\/2007)/i);
  });
  it('enlaza al RGPD (EUR-Lex) o LOPDGDD (BOE)', () => {
    expect(doc).toMatch(/eur-lex|32016R0679/);
  });
});

describe('[legal-review-draft] no rompe las 4 páginas legales de producción', () => {
  it('NO modifica /sorteos/(legal)/terminos', () => {
    // El fichero de Términos sigue siendo el mismo shape post-PR-C.
    const src = read('src/app/sorteos/(legal)/terminos/page.tsx');
    // Un smoke check: el rebrand "canjeo de recompensas" sigue vigente.
    expect(src).toMatch(/6\.\s*Canjeo de recompensas/);
  });

  it('NO modifica el LegalDraftBanner ni el layout legal', () => {
    const src = read('src/app/sorteos/(legal)/layout.tsx');
    expect(src).toMatch(/LegalDraftBanner/);
  });

  it('el doc borrador NO se importa desde ningún componente TSX', () => {
    // Comprobamos que ningún archivo TSX importa/incluye el .md.
    const srcDir = path.join(ROOT, 'src');
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          out.push(...walk(full));
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          out.push(full);
        }
      }
      return out;
    };
    const files = walk(srcDir);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf-8');
      expect(src).not.toContain('socialpro-giveaways-legal-review-spain');
    }
  });
});
