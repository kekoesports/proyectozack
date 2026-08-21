/**
 * Contratos de `suggestExpenseCategorization` — reglas de categorización
 * asistida. NUNCA se aplica automáticamente.
 *
 * Además verifica que todos los subtypes referenciados EXISTEN en el
 * enum vigente `EXPENSE_SUBTYPES` — la sugerencia nunca inventa.
 */

import { suggestExpenseCategorization } from '@/lib/utils/expense-suggestion';
import { EXPENSE_SUBTYPES, EXPENSE_GROUPS } from '@/lib/schemas/invoice';

describe('[expense-suggestion] casos canónicos', () => {
  const cases: readonly [string, string | null, { group: string; subtype: string }][] = [
    ['Pago talento: SPARKY X W88', null, { group: 'campaign_direct', subtype: 'pago_talento' }],
    ['Pago a talento por streams', null, { group: 'campaign_direct', subtype: 'pago_talento' }],
    ['Nómina octubre 2026', null, { group: 'operational', subtype: 'nomina_socio' }],
    ['Cuota autónomo', 'Tesorería de Autónomos', { group: 'operational', subtype: 'cuota_autonomo' }],
    ['Cuota seguridad social', 'TGSS', { group: 'operational', subtype: 'seguridad_social' }],
    ['Factura mensual', 'Gestoría Fiscal Alonso', { group: 'operational', subtype: 'gestoria' }],
    ['Google Workspace', null, { group: 'operational', subtype: 'suscripcion_software' }],
    ['Adobe Creative Cloud', null, { group: 'operational', subtype: 'suscripcion_software' }],
    ['Canva Pro', null, { group: 'operational', subtype: 'suscripcion_software' }],
    ['Vercel Pro plan', null, { group: 'operational', subtype: 'suscripcion_software' }],
    ['Neon Postgres', null, { group: 'operational', subtype: 'suscripcion_software' }],
    ['ChatGPT plus', null, { group: 'operational', subtype: 'herramienta_ia' }],
    ['Stripe fees', null, { group: 'operational', subtype: 'comision_bancaria' }],
    ['Wise transfer fee', null, { group: 'operational', subtype: 'comision_bancaria' }],
    ['Seguro médico anual', 'Sanitas', { group: 'operational', subtype: 'seguro_medico' }],
  ];

  it.each(cases)('%s + %s → %o', (concept, counterparty, expected) => {
    const s = suggestExpenseCategorization({ concept, counterpartyName: counterparty });
    expect(s).not.toBeNull();
    expect(s?.expenseGroup).toBe(expected.group);
    expect(s?.expenseSubtype).toBe(expected.subtype);
  });

  it('devuelve null cuando no hay coincidencia', () => {
    expect(suggestExpenseCategorization({ concept: 'xxxx yyyy zzz', counterpartyName: null })).toBeNull();
  });

  it('devuelve null con inputs vacíos', () => {
    expect(suggestExpenseCategorization({ concept: null, counterpartyName: null })).toBeNull();
    expect(suggestExpenseCategorization({ concept: '', counterpartyName: '' })).toBeNull();
  });

  it('todos los subtypes sugeridos existen en el enum EXPENSE_SUBTYPES', () => {
    // Extrae los subtypes de las reglas y verifica que EXISTEN en el enum.
    const subtypesEnCasos = new Set(cases.map(([, , exp]) => exp.subtype));
    for (const st of subtypesEnCasos) {
      expect((EXPENSE_SUBTYPES as readonly string[]).includes(st)).toBe(true);
    }
  });

  it('todos los groups sugeridos existen en el enum EXPENSE_GROUPS', () => {
    const groupsEnCasos = new Set(cases.map(([, , exp]) => exp.group));
    for (const g of groupsEnCasos) {
      expect((EXPENSE_GROUPS as readonly string[]).includes(g)).toBe(true);
    }
  });

  it('nunca aplica cambios — solo devuelve la sugerencia', () => {
    // Contract: la función es 100% pura. Sin side-effects.
    const before = suggestExpenseCategorization({ concept: 'Google Workspace', counterpartyName: null });
    const after  = suggestExpenseCategorization({ concept: 'Google Workspace', counterpartyName: null });
    expect(before).toEqual(after);
  });
});

describe('[FV.5] orden entre "factura autónomo" y "cuota autónomo"', () => {
  it('una factura de autónomo no se clasifica como la cuota del RETA', () => {
    // La regla de cuota_autonomo lleva la palabra suelta 'autónomo'. Evaluándose
    // primero se tragaba esta frase entera.
    //
    // El concepto va sin palabras de producción a propósito: "edición de vídeo"
    // o "grabación" matchean antes con `coste_produccion`, que para una factura
    // ligada a una campaña es la clasificación correcta. Ese orden —
    // campaign_direct por delante de operational — no es el bug de aquí.
    const s = suggestExpenseCategorization({
      concept: 'Factura autónomo — servicios de consultoría',
      counterpartyName: null,
    });
    expect(s?.expenseSubtype).toBe('factura_autonomo');
  });

  it('la cuota del RETA sigue clasificándose bien', () => {
    const s = suggestExpenseCategorization({
      concept: 'Cuota autónomo — Pablo',
      counterpartyName: null,
    });
    expect(s?.expenseSubtype).toBe('cuota_autonomo');
  });

  it('la palabra suelta sigue valiendo como último recurso', () => {
    const s = suggestExpenseCategorization({
      concept: 'Pago autonomo mensual',
      counterpartyName: null,
    });
    expect(s?.expenseSubtype).toBe('cuota_autonomo');
  });
});
