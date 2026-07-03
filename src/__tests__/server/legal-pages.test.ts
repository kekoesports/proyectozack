/**
 * Contratos estructurales de las 4 páginas legales de SocialPro Giveaways:
 *   /sorteos/faq
 *   /sorteos/terminos
 *   /sorteos/privacidad
 *   /sorteos/juego-responsable
 *
 * + Banner "borrador pendiente de revisión legal" común.
 * + Footer de la plataforma con links legales.
 * + Reglas de límites del PR: no promesas de jurisdicción, no activación
 *   de verificación de depósitos, no logs de secretos.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const LEGAL_PAGES = [
  { route: 'faq',                file: 'src/app/sorteos/(legal)/faq/page.tsx' },
  { route: 'terminos',           file: 'src/app/sorteos/(legal)/terminos/page.tsx' },
  { route: 'privacidad',         file: 'src/app/sorteos/(legal)/privacidad/page.tsx' },
  { route: 'juego-responsable',  file: 'src/app/sorteos/(legal)/juego-responsable/page.tsx' },
] as const;

describe('[legal] archivos existen y montan Page', () => {
  for (const { route, file } of LEGAL_PAGES) {
    it(`/sorteos/${route} existe (${file})`, () => {
      const src = read(file);
      expect(src).toMatch(/export default function [A-Z][A-Za-z]*Page\(/);
    });
  }

  it('layout compartido bajo route group (legal)', () => {
    const layout = read('src/app/sorteos/(legal)/layout.tsx');
    expect(layout).toMatch(/export default function LegalLayout/);
    expect(layout).toMatch(/<LegalDraftBanner\s*\/>/);
  });
});

describe('[legal] metadata robots + canonical', () => {
  for (const { route, file } of LEGAL_PAGES) {
    it(`${route} — canonical /sorteos/${route} y robots noindex (borrador)`, () => {
      const src = read(file);
      expect(src).toMatch(new RegExp(`canonical:\\s*'/sorteos/${route}'`));
      expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
    });
  }
});

describe('[legal] LegalDraftBanner marca inequívoca de borrador', () => {
  const src = read('src/features/giveaway-platform/components/LegalDraftBanner.tsx');

  it("dice explícitamente 'pendiente de revisión legal'", () => {
    expect(src).toMatch(/pendiente de revisión legal/i);
  });
  it("aclara que no es documento vinculante en su forma actual", () => {
    expect(src).toMatch(/no debe considerarse un documento vinculante/i);
  });
  it("tiene rol accesible 'note' con aria-label descriptivo", () => {
    expect(src).toMatch(/role="note"/);
    expect(src).toMatch(/aria-label="Aviso: documento en borrador"/);
  });
});

describe('[legal] cada página adaptada a SocialPro Giveaways (no copia de otro proyecto)', () => {
  for (const { route, file } of LEGAL_PAGES) {
    const src = read(file);
    it(`${route} usa el nombre de la plataforma SocialPro Giveaways`, () => {
      expect(src).toMatch(/SocialPro Giveaways/);
    });
    it(`${route} NO contiene copy de Tarifa u otros proyectos ajenos`, () => {
      // Safeguard defensivo: si algún día alguien pega copy de otro proyecto,
      // salta este test.
      expect(src).not.toMatch(/\bTarifa\b/);
      expect(src).not.toMatch(/lorem ipsum/i);
    });
    it(`${route} referencia la plataforma /sorteos/plataforma`, () => {
      // La FAQ/términos/privacidad/juego citan la ruta real del producto.
      expect(src).toMatch(/\/sorteos\/plataforma/);
    });
  }
});

describe('[legal] términos — NO afirma jurisdicción definitiva', () => {
  const src = read('src/app/sorteos/(legal)/terminos/page.tsx');

  it('sección de ley y jurisdicción existe pero es explícitamente pendiente', () => {
    expect(src).toMatch(/Ley y jurisdicción/i);
    expect(src).toMatch(/pendiente de definición por asesoría jurídica/i);
    expect(src).toMatch(/no puede interpretarse como sometimiento a una jurisdicción/i);
  });
});

describe('[legal] términos — NO activa verificación de depósitos', () => {
  const src = read('src/app/sorteos/(legal)/terminos/page.tsx');

  it('afirma que la plataforma no acepta depósitos económicos', () => {
    expect(src).toMatch(/no acepta\s+depósitos económicos/i);
    expect(src).toMatch(/no cobra comisiones/i);
  });
  it('no activa mecánica de verificación de depósitos ("no ofrece verificación ni activación de depósitos")', () => {
    // El texto legal cita explícitamente que NO ofrece verificación ni
    // activación de depósitos. Verificamos esa frase concreta — el test
    // legacy comprobaba la ausencia genérica de KYC, que también aplica.
    expect(src).toMatch(/no ofrece verificación ni activación de[\s\S]{0,30}depósitos/i);
    expect(src).not.toMatch(/\bKYC\b/i);
  });
});

describe('[legal] juego responsable — recursos DGOJ + separación de partners externos', () => {
  const src = read('src/app/sorteos/(legal)/juego-responsable/page.tsx');

  it('afirma que los sorteos internos son gratuitos y NO son apuestas', () => {
    expect(src).toMatch(/no constituyen apuestas|no es una actividad de juego regulado/i);
  });
  it('cita DGOJ (jugarbien.es) como recurso oficial', () => {
    expect(src).toMatch(/jugarbien\.es/);
  });
  it('cita FEJAR y RGIAJ (autoexclusión estatal)', () => {
    expect(src).toMatch(/FEJAR/);
    expect(src).toMatch(/RGIAJ/);
  });
  it('teléfono gratuito DGOJ 900 810 011', () => {
    expect(src).toMatch(/900 810 011/);
  });
  it('separa autoexclusión de partners externos', () => {
    expect(src).toMatch(/autoexclusión de partners externos/i);
    expect(src).toMatch(/SocialPro no puede ejecutarla en tu nombre/i);
  });
});

describe('[legal] privacidad — RGPD + no datos sensibles', () => {
  const src = read('src/app/sorteos/(legal)/privacidad/page.tsx');

  it('cita el RGPD (bases jurídicas 6.1)', () => {
    expect(src).toMatch(/RGPD/);
    expect(src).toMatch(/art\.\s*6\.1\.b/i);
    expect(src).toMatch(/art\.\s*6\.1\.a/i);
    expect(src).toMatch(/art\.\s*6\.1\.f/i);
  });
  it('AEPD como autoridad de reclamación', () => {
    expect(src).toMatch(/Agencia Española de Protección de Datos/);
  });
  it('afirma que NO se tratan tarjetas ni contraseñas ni datos sensibles', () => {
    expect(src).toMatch(/No tratamos:[\s\S]{0,120}tarjetas de crédito[\s\S]{0,120}contraseñas/i);
  });
  it('lista los partners de infraestructura (Vercel + Neon + Resend)', () => {
    expect(src).toMatch(/Vercel/);
    expect(src).toMatch(/Neon/);
    expect(src).toMatch(/Resend/);
  });
});

describe('[legal] PlatformFooter con links legales', () => {
  const src = read('src/features/giveaway-platform/components/PlatformFooter.tsx');
  it('enlaza las 4 páginas legales', () => {
    expect(src).toMatch(/href="\/sorteos\/faq"/);
    expect(src).toMatch(/href="\/sorteos\/terminos"/);
    expect(src).toMatch(/href="\/sorteos\/privacidad"/);
    expect(src).toMatch(/href="\/sorteos\/juego-responsable"/);
  });
  it('mantiene el tagline "SOCIALPRO GIVEAWAYS · sin apuestas · +18"', () => {
    expect(src).toMatch(/SOCIALPRO GIVEAWAYS/);
    expect(src).toMatch(/Sin apuestas/);
    expect(src).toMatch(/\+18/);
  });
});

describe('[legal] PlatformFooter integrado en las 3 páginas dinámicas', () => {
  const files = [
    'src/app/sorteos/plataforma/page.tsx',
    'src/app/sorteos/plataforma/perfil/page.tsx',
    'src/app/sorteos/plataforma/creadores/[slug]/page.tsx',
  ];
  for (const f of files) {
    it(`${f} usa <PlatformFooter />`, () => {
      const src = read(f);
      expect(src).toMatch(/import\s*\{\s*PlatformFooter\s*\}/);
      expect(src).toMatch(/<PlatformFooter\s*\/>/);
      // El footer inline antiguo ya no debe existir aquí.
      expect(src).not.toMatch(/<footer className="gp-footer">\s*<b>SOCIALPRO GIVEAWAYS/);
    });
  }
});

describe('[legal] CSS de las páginas legales', () => {
  const css = read('src/app/sorteos/plataforma/platform-legal.css');
  it('define .gp-legal-draft con dashed border gold', () => {
    expect(css).toMatch(/\.gp-legal-draft\s*\{[\s\S]{0,400}border:\s*1px\s+dashed/);
  });
  it('define .gp-legal-qa collapsible con marker custom', () => {
    expect(css).toMatch(/\.gp-legal-qa\s+summary::after/);
  });
});

describe('[legal] reglas del PR — sin cambios prohibidos', () => {
  it('page.tsx dinámicas NO llaman a coinTransactions.insert desde las legales', () => {
    for (const { file } of LEGAL_PAGES) {
      const src = read(file);
      expect(src).not.toMatch(/coinTransactions/);
      expect(src).not.toMatch(/giveawayEntries/);
      expect(src).not.toMatch(/missionClaims/);
    }
  });
  it('ninguna página legal referencia .env, secretos o API keys', () => {
    for (const { file } of LEGAL_PAGES) {
      const src = read(file);
      expect(src).not.toMatch(/process\.env/);
      expect(src).not.toMatch(/KEYDROP_ZACKETIZOR_API_KEY/);
      expect(src).not.toMatch(/api[_-]?key/i);
    }
  });
});
