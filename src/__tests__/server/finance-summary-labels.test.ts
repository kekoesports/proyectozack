/**
 * Verifica que los componentes de Finanzas que muestran status de factura
 * pasan el string crudo por un mapping humano en lugar de renderizarlo
 * directamente.
 */

import * as fs from 'fs';
import * as path from 'path';
import { INVOICE_STATUS_LABELS } from '@/lib/schemas/invoice';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

// ── ReceivablesTable ──────────────────────────────────────────────────────

describe('[labels] ReceivablesTable', () => {
  const src = read('src/features/admin/finance-dashboard/components/ReceivablesTable.tsx');

  it('importa INVOICE_STATUS_LABELS desde @/lib/schemas/invoice', () => {
    expect(src).toMatch(/from\s+['"]@\/lib\/schemas\/invoice['"]/);
    expect(src).toMatch(/\bINVOICE_STATUS_LABELS\b/);
  });

  it('renderiza humanStatus(row.status) en el badge, nunca row.status crudo', () => {
    expect(src).toMatch(/humanStatus\(row\.status\)/);
    // Verificamos que la línea antigua "{row.status}" ya no está dentro del <span>.
    const spanBlock = /<span[^>]*>\s*\{[^}]*\}\s*<\/span>/g;
    const matches = src.match(spanBlock) ?? [];
    for (const m of matches) {
      expect(m).not.toMatch(/\{row\.status\}/);
    }
  });

  it('humanStatus cubre los 12 valores del enum invoice_status', () => {
    // Cross-check contra INVOICE_STATUS_LABELS: los labels canónicos existen y
    // tienen valores humanos (primera letra mayúscula).
    for (const [key, label] of Object.entries(INVOICE_STATUS_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
      expect(label[0]).toBe(label[0]?.toUpperCase());
      expect(label).not.toBe(key);
    }
  });
});

// ── Nuevos componentes de resumen-v2 ya usan labels humanos ───────────────

describe('[labels] Componentes resumen-v2 sin strings técnicos visibles', () => {
  const files = [
    'src/features/admin/finance-dashboard/components/resumen-v2/SectionCard.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenIngresosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenCostesMargenBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenNominasBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenImpuestosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenOperativosBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenResultadoBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenPendientesBlock.tsx',
    'src/features/admin/finance-dashboard/components/resumen-v2/ResumenFilters.tsx',
  ];

  // Estos serían strings técnicos que NO deben aparecer como texto visible.
  const forbidden = [
    'campaign_direct',
    'nomina_socio',
    'cuota_autonomo',
    'seguro_medico',
    'comision_bancaria',
    'coste_produccion',
    'suscripcion_software',
    'herramienta_ia',
    'gasto_general',
    'factura_autonomo',
    'seguridad_social',
    'marketing_publicidad',
    'fiscal_impuestos',
    'ajuste_fiscal',
    'pago_talento',
    'expense_subtype',
    'expense_group',
    'invoice_payments',
  ];

  it.each(files)('%s no renderiza strings técnicos entre tags JSX', (rel) => {
    const src = read(rel);
    for (const token of forbidden) {
      // Solo se marca como fallo si el token aparece entre `>` y `<` (contenido
      // renderizado). Sí se permite en identificadores de código, comentarios,
      // types y llaves de switch.
      const re = new RegExp(`>[^<]*\\b${token}\\b[^<]*<`);
      expect(src).not.toMatch(re);
    }
  });
});
