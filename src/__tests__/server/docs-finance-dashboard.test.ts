/**
 * Verifica que docs/finance-dashboard.md cubre las 13 secciones pedidas
 * en el loop nocturno (Tarea 3) y menciona los conceptos clave del
 * rediseño de julio 2026.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOC = fs.readFileSync(path.join(PROJECT_ROOT, 'docs/finance-dashboard.md'), 'utf-8');

describe('[docs] finance-dashboard.md — cobertura de secciones', () => {
  const requiredSections: Array<[string, RegExp]> = [
    ['1. /admin/finanzas/resumen',                     /\/admin\/finanzas\/resumen/],
    ['2. /admin/finanzas/mes',                          /\/admin\/finanzas\/mes/],
    ['3. /admin/finanzas/pl',                           /\/admin\/finanzas\/pl/],
    ['4. /admin/finanzas/cobros',                       /\/admin\/finanzas\/cobros/],
    ['5. Pagos a talentos vs Gastos operativos',        /pagos? a talentos[\s\S]*gastos operativos|Pagos a talentos[\s\S]*coste directo/i],
    ['6. Nóminas vs Impuestos vs Operativos',           /Nóminas[\s\S]*Impuestos[\s\S]*Operativos|nomina_socio[\s\S]*cuota_autonomo/i],
    ['7. Margen bruto',                                 /Margen bruto/i],
    ['8. Resultado operativo',                          /Resultado operativo/i],
    ['9. Margen pendiente estimado',                    /Margen pendiente estimado/i],
    ['10. invoice_payments canónico',                   /invoice_payments/],
    ['11. paidAmount deprecated',                       /paidAmount[\s\S]*deprecated|@deprecated/i],
    ['12. Recurrentes activos Pablo/Alfonso/Gestoría',  /Cuota autónomo — Pablo[\s\S]*Seguro médico — Alfonso[\s\S]*Gestoría/i],
    ['13. Cron generate-recurring-expenses',            /generate-recurring-expenses[\s\S]*0 3 \* \* \*/i],
  ];

  it.each(requiredSections)('cubre sección: %s', (_label, pattern) => {
    expect(DOC).toMatch(pattern);
  });
});

describe('[docs] finance-dashboard.md — estado tras rediseño 2026-07', () => {
  it('menciona la fecha de última actualización', () => {
    expect(DOC).toMatch(/2026-07-\d{2}/);
  });

  it('indica que TD-14 está cerrado', () => {
    expect(DOC).toMatch(/TD-14.*cerrado|TD-14 cerrado/i);
  });

  it('menciona TD-14b como decisión de diseño (no accionable)', () => {
    expect(DOC).toMatch(/TD-14b/);
    expect(DOC).toMatch(/decisi[óo]n de dise[ñn]o|no accionable/i);
  });

  it('lista las 5 plantillas de recurring_expenses (2 legacy + 3 activas)', () => {
    for (const name of [
      'Cuota autónomo — Keko',
      'Cuota autónomo — Zack',
      'Cuota autónomo — Pablo',
      'Seguro médico — Alfonso',
      'Gestoría',
    ]) {
      expect(DOC).toContain(name);
    }
  });

  it('indica que el schedule del cron es diario 03:00 UTC', () => {
    expect(DOC).toMatch(/0 3 \* \* \*/);
    expect(DOC).toMatch(/diario/i);
  });

  it("documenta la convención status='pagada' sin invoice_payments", () => {
    // Nueva sección añadida tras el cierre del loop nocturno.
    expect(DOC).toMatch(/status='pagada' sin `invoice_payments`|status='pagada'[\s\S]*invoice_payments/i);
    expect(DOC).toMatch(/32 filas/);
    expect(DOC).toMatch(/no son equivalentes/i);
  });

  it('deja claro que invoice_payments = cash real y status = estado operativo', () => {
    expect(DOC).toMatch(/cash real/i);
    expect(DOC).toMatch(/estado \*\*operativo\/manual\*\*|estado operativo/i);
  });
});
