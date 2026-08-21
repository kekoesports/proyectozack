/**
 * FV.5 — el validador de gastos.
 *
 * La regla que da sentido a todo: **solo se avisa ante contradicción**. Un
 * perfil fiscal bien anotado no genera ni un aviso, porque un asistente que
 * pinta de naranja lo que está bien consigue que nadie lea los naranjas.
 *
 * Los casos vienen de facturas reales de 2026 (Vityshow, Martínez, KLED,
 * Alejandro, Tyler J, Adrián García, Higgsfield, OpenAI).
 */

import {
  calcularEfecto,
  esProveedorConIsp,
  etiquetaDeducibilidad,
  evaluarGasto,
  retencionEsperada,
  sugerirTipoFiscal,
  type BorradorGasto,
  type PerfilFiscal,
} from '@/lib/finance/expenseAssistant.shared';

function perfil(overrides: Partial<PerfilFiscal> = {}): PerfilFiscal {
  return {
    talentId: 1,
    nombre: 'Talento',
    taxType: 'autonomo_es',
    iaeActividad: 'profesional',
    iaeEpigrafe: '751',
    nif: '12345678Z',
    creatorCountry: 'ES',
    ...overrides,
  };
}

function gasto(overrides: Partial<BorradorGasto> = {}): BorradorGasto {
  return {
    netAmount: 1000,
    vatPct: 21,
    withholdingPct: 15,
    currency: 'EUR',
    counterpartyName: 'Proveedor SL',
    concept: 'Campaña de agosto',
    nifEnFactura: 'B12345678',
    aNombrePersonal: false,
    mesesDeServicio: null,
    expenseSubtype: 'pago_talento',
    ...overrides,
  };
}

const codigos = (avisos: readonly { codigo: string }[]): string[] => avisos.map((a) => a.codigo);

describe('retencionEsperada — la sección del IAE manda sobre el tipo fiscal', () => {
  it('autónomo profesional retiene el 15%', () => {
    expect(retencionEsperada(perfil())).toBe(15);
  });

  it('autónomo nuevo retiene el 7%', () => {
    expect(retencionEsperada(perfil({ taxType: 'autonomo_es_nuevo' }))).toBe(7);
  });

  it('autónomo con actividad EMPRESARIAL no retiene, aunque su tipo diga 15%', () => {
    // Es el caso de Martínez y Naow: autónomos, pero de alta en 961.1 / 844.
    expect(retencionEsperada(perfil({ iaeActividad: 'empresarial' }))).toBe(0);
  });

  it('sin la sección anotada no se puede saber, y eso no es lo mismo que cero', () => {
    expect(retencionEsperada(perfil({ iaeActividad: null }))).toBeNull();
  });

  it('una sociedad no retiene y no necesita epígrafe', () => {
    expect(retencionEsperada(perfil({ taxType: 'sl_sa', iaeActividad: null }))).toBe(0);
  });

  it('LATAM no retiene IRPF español', () => {
    expect(retencionEsperada(perfil({ taxType: 'latam', iaeActividad: null }))).toBe(0);
  });

  it('sin perfil fiscal no hay respuesta', () => {
    expect(retencionEsperada(perfil({ taxType: null }))).toBeNull();
  });
});

describe('evaluarGasto — el silencio cuando todo cuadra', () => {
  it('un perfil correcto y una factura correcta no generan ni un aviso', () => {
    expect(evaluarGasto(gasto(), perfil())).toHaveLength(0);
  });

  it('un talento empresarial sin retención tampoco genera ruido', () => {
    // Martínez: factura sin retención y es correcto porque su epígrafe es 961.1.
    const avisos = evaluarGasto(
      gasto({ withholdingPct: 0 }),
      perfil({ nombre: 'Martínez', iaeActividad: 'empresarial' }),
    );
    expect(avisos).toHaveLength(0);
  });

  it('un extranjero sin retención es correcto y no se le molesta', () => {
    // Tyler J LLC.
    const avisos = evaluarGasto(
      gasto({ withholdingPct: 0, vatPct: 0, counterpartyName: 'Tyler J LLC', nifEnFactura: 'US-123' }),
      perfil({ nombre: 'Tyler', taxType: 'no_residente', iaeActividad: null }),
    );
    expect(codigos(avisos)).not.toContain('falta-retencion');
  });
});

describe('evaluarGasto — cuando hay contradicción', () => {
  it('sin epígrafe y sin retención, pide confirmar el epígrafe', () => {
    const avisos = evaluarGasto(gasto({ withholdingPct: 0 }), perfil({ iaeActividad: null }));
    expect(codigos(avisos)).toContain('perfil-incompleto');
  });

  it('perfil profesional al que le falta la retención', () => {
    const avisos = evaluarGasto(gasto({ withholdingPct: 0 }), perfil());
    const aviso = avisos.find((a) => a.codigo === 'falta-retencion');
    expect(aviso?.titulo).toContain('15%');
  });

  it('retención de más sobre un perfil que no retiene', () => {
    const avisos = evaluarGasto(gasto({ withholdingPct: 15 }), perfil({ iaeActividad: 'empresarial' }));
    expect(codigos(avisos)).toContain('retencion-de-mas');
  });

  it('el 7% sobre un autónomo que ya no es nuevo', () => {
    // Alejandro F-3: 7% correcto solo durante los primeros años.
    const avisos = evaluarGasto(gasto({ withholdingPct: 7 }), perfil({ taxType: 'autonomo_es' }));
    const aviso = avisos.find((a) => a.codigo === 'retencion-distinta');
    expect(aviso?.detalle).toContain('primeros años');
  });

  it('autónomo español sin IVA: la franquicia no está en vigor aquí', () => {
    // KLED: 1.350,43 € sin IVA con retención del 15%.
    const avisos = evaluarGasto(gasto({ vatPct: 0 }), perfil({ nombre: 'KLED' }));
    expect(codigos(avisos)).toContain('autonomo-sin-iva');
  });

  it('autónomo español facturando en dólares', () => {
    // Andrea (1.500 $) y Alejandro (1.250 $).
    const avisos = evaluarGasto(gasto({ currency: 'USD' }), perfil({ nombre: 'Andrea' }));
    expect(codigos(avisos)).toContain('autonomo-en-divisa');
  });

  it('una ficha que existe pero no dice cómo tributa no pasa por comprobada', () => {
    // HETTA, Sparky, ADAMS, n1bz… tienen ficha y pagos, y el tipo fiscal en
    // blanco. Sin ese dato ninguna comprobación de retención tiene base, y el
    // silencio del validador se leía como "comprobado y correcto".
    const avisos = evaluarGasto(gasto(), perfil({ taxType: null, iaeActividad: null }));
    expect(codigos(avisos)).toContain('falta-tipo-fiscal');
    // No es el mismo aviso que "falta la sección del IAE": se arregla en otro
    // campo, así que fundirlos en un código mandaría a rellenar lo que no es.
    expect(codigos(avisos)).not.toContain('perfil-incompleto');
  });

  it('con el tipo fiscal en blanco no se inventa un aviso de retención', () => {
    const avisos = evaluarGasto(gasto({ withholdingPct: 0 }), perfil({ taxType: null, iaeActividad: null }));
    expect(codigos(avisos)).not.toContain('falta-retencion');
    expect(codigos(avisos)).not.toContain('retencion-de-mas');
  });

  it('un pago a talento sin perfil fiscal en su ficha', () => {
    const avisos = evaluarGasto(gasto(), null);
    expect(codigos(avisos)).toContain('sin-perfil');
  });
});

describe('evaluarGasto — lo que bloquea la deducción', () => {
  it('factura a nombre personal', () => {
    // Neon, con el Gmail personal.
    const avisos = evaluarGasto(gasto({ aNombrePersonal: true }), perfil());
    const error = avisos.find((a) => a.nivel === 'error');
    expect(error?.codigo).toBe('sin-nif-sociedad');
    expect(error?.detalle).toContain('NIF de la sociedad');
  });

  it('factura sin NIF ninguno', () => {
    // Higgsfield.
    const avisos = evaluarGasto(
      gasto({ nifEnFactura: null, counterpartyName: 'Un proveedor cualquiera' }),
      perfil(),
    );
    expect(avisos.some((a) => a.nivel === 'error')).toBe(true);
  });

  it('un proveedor con ISP sin NIF no es un error: es como factura', () => {
    const avisos = evaluarGasto(
      gasto({ nifEnFactura: null, counterpartyName: 'OpenAI Ireland Ltd', vatPct: 0, withholdingPct: 0, expenseSubtype: 'herramienta_ia' }),
      null,
    );
    expect(avisos.some((a) => a.nivel === 'error')).toBe(false);
    expect(codigos(avisos)).toContain('isp');
  });

  it('los errores van antes que los avisos', () => {
    const avisos = evaluarGasto(gasto({ aNombrePersonal: true, withholdingPct: 0 }), perfil());
    expect(avisos[0]?.nivel).toBe('error');
  });
});

describe('esProveedorConIsp', () => {
  it('reconoce a los de siempre', () => {
    expect(esProveedorConIsp('OpenAI Ireland Ltd')).toBe(true);
    expect(esProveedorConIsp('Google Cloud EMEA')).toBe(true);
    expect(esProveedorConIsp('Anthropic PBC')).toBe(true);
  });

  it('no confunde a un proveedor español', () => {
    expect(esProveedorConIsp('IONOS Cloud SLU')).toBe(false);
    expect(esProveedorConIsp(null)).toBe(false);
  });
});

describe('etiquetaDeducibilidad', () => {
  it('todo correcto: deducible con su IVA', () => {
    const g = gasto();
    const r = etiquetaDeducibilidad(g, evaluarGasto(g, perfil()));
    expect(r.nivel).toBe('deducible');
    expect(r.ivaDeducible).toBe(210);
  });

  it('con un error, no deducible y cero IVA', () => {
    const g = gasto({ aNombrePersonal: true });
    const r = etiquetaDeducibilidad(g, evaluarGasto(g, perfil()));
    expect(r.nivel).toBe('no-deducible');
    expect(r.ivaDeducible).toBe(0);
  });

  it('ISP: el gasto es deducible pero no genera IVA a recuperar', () => {
    const g = gasto({ counterpartyName: 'OpenAI Ireland Ltd', vatPct: 0, withholdingPct: 0, nifEnFactura: null });
    const r = etiquetaDeducibilidad(g, evaluarGasto(g, null));
    expect(r.nivel).toBe('deducible');
    expect(r.ivaDeducible).toBe(0);
  });

  it('con avisos sin resolver, queda pendiente de determinar', () => {
    const g = gasto({ withholdingPct: 0 });
    const r = etiquetaDeducibilidad(g, evaluarGasto(g, perfil()));
    expect(r.nivel).toBe('sin-determinar');
  });
});

describe('calcularEfecto — lo que le hace a las cifras', () => {
  it('el resultado baja por la base, no por el total pagado', () => {
    // Vityshow: base 707,55 + IVA 148,59 − retención 106,13 = 750,01 transferidos.
    const g = gasto({ netAmount: 707.55, vatPct: 21, withholdingPct: 15 });
    const e = calcularEfecto(g, 148.59);
    expect(e.reduceResultado).toBe(707.55);
    expect(e.sePaga).toBe(750.01);
    expect(e.recuperaIva).toBe(148.59);
    expect(e.retencionAIngresar).toBe(106.13);
  });

  it('sin retención, se paga base más IVA', () => {
    const g = gasto({ netAmount: 1000, vatPct: 21, withholdingPct: 0 });
    expect(calcularEfecto(g, 210).sePaga).toBe(1210);
  });

  it('la retención no reduce el resultado: es dinero del proveedor', () => {
    const g = gasto({ netAmount: 1000, vatPct: 0, withholdingPct: 15 });
    const e = calcularEfecto(g, 0);
    expect(e.reduceResultado).toBe(1000);
    expect(e.sePaga).toBe(850);
    expect(e.retencionAIngresar).toBe(150);
  });
});

describe('sugerirTipoFiscal — un punto de partida, no una respuesta', () => {
  it('España sugiere autónomo, que es el caso más común del roster', () => {
    expect(sugerirTipoFiscal('ES')).toBe('autonomo_es');
  });

  it('los países de LATAM sugieren el perfil sin retención española', () => {
    expect(sugerirTipoFiscal('AR')).toBe('latam');
    expect(sugerirTipoFiscal('VE')).toBe('latam');
    expect(sugerirTipoFiscal('PE')).toBe('latam');
  });

  it('el resto del mundo, no residente', () => {
    expect(sugerirTipoFiscal('US')).toBe('no_residente');
    expect(sugerirTipoFiscal('TR')).toBe('no_residente');
  });

  it('sin país no se sugiere nada, en vez de adivinar', () => {
    expect(sugerirTipoFiscal(null)).toBeNull();
    expect(sugerirTipoFiscal('')).toBeNull();
    expect(sugerirTipoFiscal('   ')).toBeNull();
  });

  it('acepta el país en minúsculas', () => {
    expect(sugerirTipoFiscal('es')).toBe('autonomo_es');
  });
});
