/**
 * FV.5 — el asistente que guía al registrar un gasto (lógica pura, sin DB).
 *
 * Lo que este módulo NO hace: decidir por su cuenta qué es deducible. Compara
 * la factura contra el perfil fiscal **que ya está guardado** en la ficha del
 * talento y solo abre la boca cuando hay una contradicción. Un perfil bien
 * anotado no genera ni un aviso; un perfil vacío sí, porque "no lo sé" no es
 * lo mismo que "está bien".
 *
 * Las etiquetas de deducibilidad son orientativas y salen de una tabla de
 * reglas explícita (`REGLAS`), pensada para que la gestoría la revise de una
 * sentada. No sustituyen a su criterio: lo preparan.
 */

// ── Perfil fiscal ───────────────────────────────────────────────────────────

/** Los cinco perfiles de `talent_tax_type`, ya existentes en el schema. */
export type TalentTaxType =
  | 'autonomo_es'
  | 'autonomo_es_nuevo'
  | 'sl_sa'
  | 'latam'
  | 'no_residente';

/** Sección del IAE. `null` = no está anotada, que es distinto de "no retiene". */
export type IaeActividad = 'profesional' | 'empresarial' | null;

export type PerfilFiscal = {
  readonly talentId: number | null;
  readonly nombre: string | null;
  readonly taxType: TalentTaxType | null;
  readonly iaeActividad: IaeActividad;
  readonly iaeEpigrafe: string | null;
  readonly nif: string | null;
  readonly creatorCountry: string | null;
};

/** Retención que corresponde a cada perfil, en porcentaje. */
export const IRPF_POR_PERFIL: Readonly<Record<TalentTaxType, number>> = {
  autonomo_es: 15,
  autonomo_es_nuevo: 7,
  sl_sa: 0,
  latam: 0,
  no_residente: 24,
};

/**
 * Retención esperada para un perfil concreto.
 *
 * La sección del IAE manda sobre el tipo: un autónomo español dado de alta en
 * actividad empresarial (961.1 audiovisual, 844 publicidad) **no** retiene,
 * aunque su `taxType` diga 15%. Es el error que más ruido genera si se ignora.
 *
 * Devuelve `null` cuando no se puede saber — sin perfil, o autónomo español sin
 * la sección anotada.
 */
export function retencionEsperada(perfil: PerfilFiscal): number | null {
  if (perfil.taxType === null) return null;
  if (perfil.taxType === 'autonomo_es' || perfil.taxType === 'autonomo_es_nuevo') {
    if (perfil.iaeActividad === 'empresarial') return 0;
    if (perfil.iaeActividad === null) return null;
    return IRPF_POR_PERFIL[perfil.taxType];
  }
  // `no_residente` cubre dos situaciones que retienen distinto: una persona
  // física con rendimientos en España (IRNR 24%) y una sociedad extranjera que
  // factura desde fuera (no retiene nada). El enum no las distingue, así que
  // aquí no se afirma ninguna — y el validador no molesta con ello.
  if (perfil.taxType === 'no_residente') return null;
  return IRPF_POR_PERFIL[perfil.taxType];
}

// ── La factura que se está registrando ──────────────────────────────────────

export type BorradorGasto = {
  readonly netAmount: number;
  readonly vatPct: number;
  readonly withholdingPct: number;
  readonly currency: string;
  readonly counterpartyName: string | null;
  readonly concept: string | null;
  /** NIF que aparece en la factura, si se ha leído. */
  readonly nifEnFactura: string | null;
  /** true cuando la factura va a nombre de una persona, no de la sociedad. */
  readonly aNombrePersonal: boolean;
  /** Meses de servicio cubiertos. > 1 sugiere periodificar. */
  readonly mesesDeServicio: number | null;
  readonly expenseSubtype: string | null;
};

// ── Avisos ──────────────────────────────────────────────────────────────────

export type NivelAviso = 'error' | 'aviso' | 'info';

export type AvisoGasto = {
  readonly codigo: string;
  readonly nivel: NivelAviso;
  readonly titulo: string;
  /** Qué mirar o corregir. Nunca "esto está mal" a secas. */
  readonly detalle: string;
};

/** Proveedores con inversión del sujeto pasivo: su IVA no se deduce. */
const PROVEEDORES_ISP = [
  'openai', 'google', 'anthropic', 'meta platforms', 'vercel', 'neon',
  'opusclip', 'copecart', 'zivo', 'digital reaxt', 'higgsfield', 'emergent',
];

export function esProveedorConIsp(nombre: string | null): boolean {
  if (!nombre) return false;
  const n = nombre.toLowerCase();
  return PROVEEDORES_ISP.some((p) => n.includes(p));
}

/**
 * Contrasta el borrador contra el perfil y devuelve solo las contradicciones.
 *
 * Orden deliberado: primero lo que impide deducir (error), después lo que hay
 * que confirmar (aviso), y al final lo meramente informativo. Una lista larga
 * de avisos de bajo valor consigue que no se lea ninguno.
 */
export function evaluarGasto(
  borrador: BorradorGasto,
  perfil: PerfilFiscal | null,
): readonly AvisoGasto[] {
  const avisos: AvisoGasto[] = [];
  const esIsp = esProveedorConIsp(borrador.counterpartyName);

  // ── Errores: bloquean la deducción ──
  if (borrador.aNombrePersonal || (borrador.nifEnFactura === null && !esIsp)) {
    avisos.push({
      codigo: 'sin-nif-sociedad',
      nivel: 'error',
      titulo: 'No deducible hasta corregir',
      detalle: borrador.aNombrePersonal
        ? 'La factura va a nombre personal. Hay que pedirla de nuevo con el NIF de la sociedad para poder deducirla.'
        : 'La factura no trae NIF. Sin él no se puede deducir el IVA ni justificar el gasto.',
    });
  }

  // ── Avisos: hay que confirmar algo ──
  if (perfil !== null) {
    const esperada = retencionEsperada(perfil);
    const lleva = borrador.withholdingPct > 0;

    // El aviso de epígrafe solo tiene sentido para un autónomo español: es el
    // único caso donde la sección del IAE cambia la respuesta. A un extranjero
    // sin retención no se le molesta — el plan lo dice explícitamente.
    const esAutonomoEsSinSeccion =
      (perfil.taxType === 'autonomo_es' || perfil.taxType === 'autonomo_es_nuevo') &&
      perfil.iaeActividad === null;

    if (esperada === null) {
      if (!lleva && esAutonomoEsSinSeccion) {
        avisos.push({
          codigo: 'perfil-incompleto',
          nivel: 'aviso',
          titulo: 'Confirma el epígrafe IAE del talento',
          detalle:
            `No sabemos si ${perfil.nombre ?? 'este talento'} está de alta como actividad profesional ` +
            '(sección 2ª, retiene) o empresarial (961.1, 844… no retiene). Sin ese dato no se puede ' +
            'decir si a esta factura le falta la retención o está bien tal cual.',
        });
      }
    } else if (esperada > 0 && !lleva) {
      avisos.push({
        codigo: 'falta-retencion',
        nivel: 'aviso',
        titulo: `Falta la retención del ${esperada}%`,
        detalle:
          `El perfil de ${perfil.nombre ?? 'este talento'} es de actividad profesional, así que su ` +
          `factura debería llevar ${esperada}% de IRPF. Si viene sin ella, hay que pedirla corregida.`,
      });
    } else if (esperada === 0 && lleva) {
      avisos.push({
        codigo: 'retencion-de-mas',
        nivel: 'aviso',
        titulo: 'Esta factura no debería llevar retención',
        detalle:
          `El perfil de ${perfil.nombre ?? 'este talento'} no retiene IRPF, y la factura trae ` +
          `${borrador.withholdingPct}%. Conviene revisarlo antes de pagarla.`,
      });
    } else if (esperada > 0 && lleva && Math.abs(borrador.withholdingPct - esperada) > 0.01) {
      avisos.push({
        codigo: 'retencion-distinta',
        nivel: 'aviso',
        titulo: `La retención no coincide con el perfil`,
        detalle:
          `La factura trae ${borrador.withholdingPct}% y al perfil le corresponde ${esperada}%. ` +
          (borrador.withholdingPct === 7 || esperada === 7
            ? 'El 7% solo se aplica durante los primeros años de alta como autónomo: comprueba si el perfil se ha quedado desactualizado.'
            : 'Revisa cuál de los dos está desactualizado.'),
      });
    }

    // Autónomo español sin IVA: la franquicia del IVA no está en vigor en España.
    const esAutonomoEs = perfil.taxType === 'autonomo_es' || perfil.taxType === 'autonomo_es_nuevo';
    if (esAutonomoEs && borrador.vatPct === 0) {
      avisos.push({
        codigo: 'autonomo-sin-iva',
        nivel: 'aviso',
        titulo: 'Un autónomo español factura con IVA',
        detalle:
          'La franquicia del IVA no está en vigor en España, así que una factura de autónomo ' +
          'residente sin IVA necesita una causa anotada (exención concreta, o que en realidad ' +
          'no sea residente y toque IRNR).',
      });
    }

    if (esAutonomoEs && borrador.currency !== 'EUR') {
      avisos.push({
        codigo: 'autonomo-en-divisa',
        nivel: 'aviso',
        titulo: `Autónomo español facturando en ${borrador.currency}`,
        detalle:
          'Se guardará el contravalor en euros al tipo del BCE de la fecha, pero conviene ' +
          'confirmar que la factura lo refleja: la base imponible del IVA va en euros.',
      });
    }
  } else if (borrador.expenseSubtype === 'pago_talento') {
    avisos.push({
      codigo: 'sin-perfil',
      nivel: 'aviso',
      titulo: 'Este talento no tiene perfil fiscal',
      detalle:
        'Sin tipo fiscal ni epígrafe en su ficha no se puede validar la retención. ' +
        'Se rellena una vez en la pestaña de negocio del talento y ya sirve para siempre.',
    });
  }

  // ── Informativo ──
  if (esIsp) {
    avisos.push({
      codigo: 'isp',
      nivel: 'info',
      titulo: 'Inversión del sujeto pasivo',
      detalle:
        'Este proveedor factura sin IVA y la sociedad se lo autorrepercute: entra al 0% y ' +
        'no genera IVA deducible. Es correcto que aparezca sin IVA.',
    });
  }

  if (borrador.mesesDeServicio !== null && borrador.mesesDeServicio > 1) {
    avisos.push({
      codigo: 'periodificar',
      nivel: 'info',
      titulo: `Cubre ${borrador.mesesDeServicio} meses de servicio`,
      detalle:
        'Un gasto que cubre varios ejercicios se puede periodificar en vez de imputarlo entero ' +
        'al mes de la factura. Decisión de la gestoría.',
    });
  }

  return avisos;
}

// ── Deducibilidad ───────────────────────────────────────────────────────────

export type Deducibilidad = 'deducible' | 'parcial' | 'no-deducible' | 'sin-determinar';

export const DEDUCIBILIDAD_LABELS: Readonly<Record<Deducibilidad, string>> = {
  deducible: 'Deducible',
  parcial: 'Deducible en parte',
  'no-deducible': 'No deducible',
  'sin-determinar': 'Pendiente de determinar',
};

/**
 * Etiqueta orientativa. Deriva de los avisos, no de una regla paralela: si algo
 * bloquea la deducción ya se ha dicho arriba, y aquí solo se resume.
 */
export function etiquetaDeducibilidad(
  borrador: BorradorGasto,
  avisos: readonly AvisoGasto[],
): { readonly nivel: Deducibilidad; readonly ivaDeducible: number } {
  const hayError = avisos.some((a) => a.nivel === 'error');
  const ivaFactura = Math.round(borrador.netAmount * (borrador.vatPct / 100) * 100) / 100;

  if (hayError) return { nivel: 'no-deducible', ivaDeducible: 0 };
  if (esProveedorConIsp(borrador.counterpartyName)) {
    return { nivel: 'deducible', ivaDeducible: 0 };
  }
  if (avisos.some((a) => a.nivel === 'aviso')) {
    return { nivel: 'sin-determinar', ivaDeducible: ivaFactura };
  }
  return { nivel: 'deducible', ivaDeducible: ivaFactura };
}

// ── Efecto en las cifras ────────────────────────────────────────────────────

export type EfectoGasto = {
  /** Cuánto baja el resultado del periodo. Es la base, no el total pagado. */
  readonly reduceResultado: number;
  /** IVA que se recupera, si es deducible. */
  readonly recuperaIva: number;
  /** Lo que se transfiere de verdad: base + IVA − retención. */
  readonly sePaga: number;
  /** Lo retenido, que se ingresa a Hacienda por el 111. */
  readonly retencionAIngresar: number;
};

/**
 * Lo que este gasto le hace a las cifras, en dinero y no en jerga.
 *
 * `reduceResultado` es la base imponible: el IVA no es gasto (se recupera o se
 * autorrepercute) y la retención tampoco lo reduce — es parte de lo que se le
 * debe al proveedor, solo que se ingresa a Hacienda en su nombre.
 */
export function calcularEfecto(
  borrador: BorradorGasto,
  ivaDeducible: number,
): EfectoGasto {
  const iva = Math.round(borrador.netAmount * (borrador.vatPct / 100) * 100) / 100;
  const retencion = Math.round(borrador.netAmount * (borrador.withholdingPct / 100) * 100) / 100;
  return {
    reduceResultado: Math.round(borrador.netAmount * 100) / 100,
    recuperaIva: ivaDeducible,
    sePaga: Math.round((borrador.netAmount + iva - retencion) * 100) / 100,
    retencionAIngresar: retencion,
  };
}

// ── Perfil por país ─────────────────────────────────────────────────────────

/** Países de LATAM presentes en el roster, en ISO-2. */
const LATAM = ['AR', 'CO', 'CL', 'PE', 'VE', 'MX', 'UY', 'EC', 'BO', 'PY', 'CR', 'PA', 'DO', 'GT'];

/**
 * Qué tipo fiscal tiene pinta de corresponderle a un talento, según su país.
 *
 * Es un punto de partida para no rellenar nueve fichas desde cero, **no una
 * respuesta**: un residente en Argentina puede tener sociedad española, y un
 * español puede facturar desde una sociedad. Quien confirma es Pablo, y hasta
 * que lo haga el campo sigue vacío y el validador sigue avisando.
 */
export function sugerirTipoFiscal(creatorCountry: string | null): string | null {
  if (creatorCountry === null || creatorCountry.trim() === '') return null;
  const pais = creatorCountry.trim().toUpperCase();
  if (pais === 'ES') return 'autonomo_es';
  if (LATAM.includes(pais)) return 'latam';
  return 'no_residente';
}
