/**
 * Contratos estructurales de las páginas legales de SocialPro Giveaways:
 *   /sorteos/faq
 *   /sorteos/terminos
 *   /sorteos/privacidad
 *   /sorteos/participacion-responsable  (antes: juego-responsable, redirect 301)
 *   /sorteos/recompensas-y-puntos       (Fase 0 legal)
 *   /sorteos/partners-externos          (Fase 0 legal)
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
  { route: 'faq',                       file: 'src/app/sorteos/(legal)/faq/page.tsx' },
  { route: 'terminos',                  file: 'src/app/sorteos/(legal)/terminos/page.tsx' },
  { route: 'privacidad',                file: 'src/app/sorteos/(legal)/privacidad/page.tsx' },
  { route: 'participacion-responsable', file: 'src/app/sorteos/(legal)/participacion-responsable/page.tsx' },
  { route: 'recompensas-y-puntos',      file: 'src/app/sorteos/(legal)/recompensas-y-puntos/page.tsx' },
  { route: 'partners-externos',         file: 'src/app/sorteos/(legal)/partners-externos/page.tsx' },
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
    it(`${route} referencia el producto público /sorteos`, () => {
      // La FAQ/términos/privacidad/juego citan la ruta canónica del producto.
      expect(src).toMatch(/\/sorteos\b/);
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

describe('[legal] participación responsable — recursos DGOJ + separación de partners externos', () => {
  const src = read('src/app/sorteos/(legal)/participacion-responsable/page.tsx');

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
  it('deja claro que SocialPro no es operador de juego (renombrado desde "juego responsable")', () => {
    // El copy suele estar partido por JSX en varias líneas — normalizamos
    // whitespace antes de matchear.
    const normalized = src.replace(/\s+/g, ' ');
    expect(normalized).toMatch(/SocialPro no es[\s\S]{0,10}un operador de juego/i);
  });
});

describe('[legal] juego-responsable — legacy redirect', () => {
  const src = read('src/app/sorteos/(legal)/juego-responsable/page.tsx');
  it('es un redirect a /sorteos/participacion-responsable', () => {
    expect(src).toMatch(/redirect\(\s*['"]\/sorteos\/participacion-responsable['"]\s*\)/);
  });
  it('no expone contenido legal — solo el redirect', () => {
    expect(src).not.toMatch(/<section/);
    expect(src).not.toMatch(/gp-legal-section/);
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
  it('enlaza las páginas legales actualizadas', () => {
    expect(src).toMatch(/href="\/sorteos\/faq"/);
    expect(src).toMatch(/href="\/sorteos\/terminos"/);
    expect(src).toMatch(/href="\/sorteos\/privacidad"/);
    expect(src).toMatch(/href="\/sorteos\/participacion-responsable"/);
    expect(src).toMatch(/href="\/sorteos\/recompensas-y-puntos"/);
    expect(src).toMatch(/href="\/sorteos\/partners-externos"/);
  });
  it('ya NO enlaza la ruta legacy /sorteos/juego-responsable', () => {
    expect(src).not.toMatch(/href="\/sorteos\/juego-responsable"/);
  });
  it('mantiene el tagline "SOCIALPRO GIVEAWAYS · sin apuestas · +18"', () => {
    expect(src).toMatch(/SOCIALPRO GIVEAWAYS/);
    expect(src).toMatch(/Sin apuestas/);
    expect(src).toMatch(/\+18/);
  });
});

describe('[legal] PlatformFooter integrado en las páginas dinámicas', () => {
  const files = [
    'src/app/sorteos/page.tsx',
    'src/app/sorteos/perfil/page.tsx',
    'src/features/giveaway-platform/components/PlatformCreatorLanding.tsx',
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
      expect(src).not.toMatch(/KEYDROP_IMANTADO_API_KEY/);
      expect(src).not.toMatch(/KEYDROP_NAOW_API_KEY/);
      expect(src).not.toMatch(/api[_-]?key/i);
    }
  });
});

describe('[legal] pass preventivo — email de contacto info@socialpro.es', () => {
  for (const { route, file } of LEGAL_PAGES) {
    it(`${route}: usa info@socialpro.es y ya NO usa marketing@socialpro.es`, () => {
      const src = read(file);
      // Al menos una aparición del email nuevo en cada página.
      expect(src).toMatch(/info@socialpro\.es/);
      // El email antiguo no debe seguir apareciendo tras el pass preventivo.
      expect(src).not.toMatch(/marketing@socialpro\.es/);
    });
  }
});

describe('[legal] pass preventivo — DPA suavizado', () => {
  const src = read('src/app/sorteos/(legal)/privacidad/page.tsx');

  it('ya NO afirma "contrato RGPD estándar" firmado con proveedores', () => {
    // Ni la afirmación exacta, ni una variante con "contrato individual" DPA firmado.
    expect(src).not.toMatch(/contrato RGPD estándar/i);
    expect(src).not.toMatch(/DPA firmado individual/i);
  });
  it('usa la fórmula prudente "acuerdos de tratamiento o condiciones de privacidad"', () => {
    expect(src).toMatch(/acuerdos de tratamiento o condiciones de privacidad/i);
    expect(src).toMatch(/sujetos al RGPD/i);
  });
});

describe('[legal] pass preventivo — conservación sin cifra dura', () => {
  const src = read('src/app/sorteos/(legal)/privacidad/page.tsx');

  it('ya NO afirma un plazo concreto de "5 años" ni "obligaciones contables"', () => {
    expect(src).not.toMatch(/\b5 años\b/);
    expect(src).not.toMatch(/obligaciones contables/i);
  });
  it('usa "durante el plazo estrictamente necesario"', () => {
    expect(src).toMatch(/durante el plazo estrictamente necesario/i);
    expect(src).toMatch(/prevenir abusos y cumplir/i);
  });
});

describe('[legal] pass preventivo — canjeo respeta derechos de consumo', () => {
  const files = [
    'src/app/sorteos/(legal)/terminos/page.tsx',
    'src/app/sorteos/(legal)/faq/page.tsx',
  ];
  for (const f of files) {
    it(`${f}: ya NO usa "firme y no reembolsable" como afirmación absoluta`, () => {
      const src = read(f);
      // La frase agresiva completa desaparece.
      expect(src).not.toMatch(/firme y no reembolsable/i);
    });
    it(`${f}: menciona la normativa de consumidores y las excepciones aplicables`, () => {
      const src = read(f);
      expect(src).toMatch(/normativa de consumidores/i);
      expect(src).toMatch(/productos digitales,\s+códigos\s+o\s+artículos ya entregados/i);
    });
  }
});

describe('[legal] pass preventivo — ajuste de saldo con proceso', () => {
  const src = read('src/app/sorteos/(legal)/terminos/page.tsx');

  it('ya NO afirma "Podemos ajustar el saldo si detectamos abuso o fraude"', () => {
    // Frase concreta original — no debe permanecer literal ni casi literal.
    expect(src).not.toMatch(/Podemos ajustar el saldo si detectamos abuso o fraude/i);
  });
  it('usa la fórmula "indicios razonables" + "informará al usuario"', () => {
    expect(src).toMatch(/indicios razonables/i);
    expect(src).toMatch(/aportar información adicional/i);
    expect(src).toMatch(/informará al usuario/i);
  });
});

describe('[legal] pass preventivo — sin sistema antifraude/multiaccount aspiracional', () => {
  const priv = read('src/app/sorteos/(legal)/privacidad/page.tsx');
  const faq  = read('src/app/sorteos/(legal)/faq/page.tsx');

  it('privacidad §3 (base 6.1.f) ya NO cita "prevención de fraude" / "prevención de multi-account" como sistema existente', () => {
    // Sustituido por lenguaje de "prevenir abusos o uso indebido".
    expect(priv).not.toMatch(/prevención de fraude/i);
    expect(priv).not.toMatch(/prevención de multi-account/i);
    expect(priv).toMatch(/prevenir abusos\s+o\s+uso indebido/i);
    expect(priv).toMatch(/revisar posibles incumplimientos/i);
  });

  it('faq ya NO cita "multi-account, bot, fraude" como enumeración cerrada', () => {
    // Sustituido por "por ejemplo, uso indebido o bots" + reserva de derecho.
    expect(faq).not.toMatch(/multi-account,\s*bot,\s*fraude/i);
    expect(faq).toMatch(/uso indebido o bots/i);
    expect(faq).toMatch(/reservamos el derecho/i);
  });
});

describe('[legal] pass preventivo — publicidad sin afirmar compliance con Leyes concretas', () => {
  const src = read('src/app/sorteos/(legal)/participacion-responsable/page.tsx');

  it('ya NO afirma "Aplicamos las buenas prácticas de la Ley 13/2022 ... y la Ley 13/2011"', () => {
    expect(src).not.toMatch(/Aplicamos las buenas prácticas de la Ley 13\/2022/i);
    expect(src).not.toMatch(/Aplicamos las buenas prácticas de la Ley 13\/2011/i);
  });
  it('usa la fórmula prudente "Nos comprometemos a alinearnos ... cuando resulten aplicables"', () => {
    expect(src).toMatch(/Nos comprometemos a alinearnos con las buenas prácticas/i);
    expect(src).toMatch(/cuando resulten aplicables/i);
    expect(src).toMatch(/sin perjuicio de la revisión legal definitiva/i);
  });
});

describe('[legal] pass preventivo — base jurídica del ranking suavizada', () => {
  const src = read('src/app/sorteos/(legal)/privacidad/page.tsx');

  it('cita el modo privado como opt-out', () => {
    expect(src).toMatch(/ranking global de la plataforma/i);
    expect(src).toMatch(/modo privado disponible en su perfil/i);
    expect(src).toMatch(/enmascara\s+el nombre en el listado/i);
  });
  it('la base jurídica y su configuración quedan pendientes de revisión legal', () => {
    expect(src).toMatch(/pendientes\s+de revisión legal definitiva/i);
  });
});
