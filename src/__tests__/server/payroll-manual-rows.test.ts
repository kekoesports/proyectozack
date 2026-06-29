import { emptyManualRow, manualRowToPayrollRow, normalizeAmount } from '@/lib/finance/payroll/manualRow';
import type { ManualRow } from '@/lib/finance/payroll/manualRow';

// ── emptyManualRow ────────────────────────────────────────────────────────────

describe('emptyManualRow — campos económicos vacíos', () => {
  it('todos los importes son cadena vacía (no valores demo)', () => {
    const row = emptyManualRow(1);
    expect(row.costoEmpresa).toBe('');
    expect(row.liquidoPercibir).toBe('');
    expect(row.totalDevengado).toBe('');
    expect(row.totalDeducciones).toBe('');
    expect(row.irpfPct).toBe('');
  });

  it('nombre del trabajador está vacío', () => {
    expect(emptyManualRow(1).counterpartyName).toBe('');
  });

  it('solo pre-rellena yearMonth cuando se pasa suggestedYearMonth', () => {
    const row = emptyManualRow(1, '2026-03');
    expect(row.yearMonth).toBe('2026-03');
  });

  it('yearMonth queda vacío si no se pasa suggestedYearMonth', () => {
    expect(emptyManualRow(1).yearMonth).toBe('');
  });

  it('no contiene valores demo de enero (1.667,51 / 1.500,00 / 350,00 / 15)', () => {
    const row = emptyManualRow(1, '2026-03');
    const allFields = Object.values(row).join('|');
    expect(allFields).not.toContain('1.667');
    expect(allFields).not.toContain('1.500');
    expect(allFields).not.toContain('350');
    // irpf=15 podría colisionar con el id, comparamos específicamente el campo
    expect(row.irpfPct).not.toBe('15');
    expect(row.costoEmpresa).not.toBe('1667.51');
  });
});

// ── manualRowToPayrollRow — validación de campos obligatorios ─────────────────

const BASE_ROW: ManualRow = {
  id: 1,
  counterpartyName: 'CAMACHO CARRION PABLO',
  yearMonth: '2026-03',
  costoEmpresa: '1.696,55',
  liquidoPercibir: '1.000,00',
  totalDevengado: '1.696,55',
  totalDeducciones: '696,55',
  irpfPct: '22,49',
  notes: '',
};

describe('manualRowToPayrollRow — fila vacía → include=false', () => {
  it('fila completamente vacía tiene include=false', () => {
    const result = manualRowToPayrollRow(emptyManualRow(1));
    expect(result.include).toBe(false);
  });

  it('fila solo con yearMonth tiene include=false (faltan nombre y coste)', () => {
    const result = manualRowToPayrollRow(emptyManualRow(1, '2026-03'));
    expect(result.include).toBe(false);
  });

  it('fila vacía tiene netAmount=0.00 (no valores demo)', () => {
    const result = manualRowToPayrollRow(emptyManualRow(1, '2026-03'));
    expect(result.netAmount).toBe('0.00');
    expect(result.totalAmount).toBe('0.00');
  });
});

describe('manualRowToPayrollRow — submit falla si falta trabajador', () => {
  it('sin nombre → include=false aunque coste y yearMonth estén presentes', () => {
    const row: ManualRow = { ...BASE_ROW, counterpartyName: '' };
    expect(manualRowToPayrollRow(row).include).toBe(false);
  });

  it('nombre solo espacios → include=false', () => {
    const row: ManualRow = { ...BASE_ROW, counterpartyName: '   ' };
    expect(manualRowToPayrollRow(row).include).toBe(false);
  });

  it('warning indica campos obligatorios faltantes', () => {
    const row: ManualRow = { ...BASE_ROW, counterpartyName: '' };
    expect(manualRowToPayrollRow(row).warning).toContain('trabajador');
  });
});

describe('manualRowToPayrollRow — submit falla si falta coste empresa', () => {
  it('costoEmpresa vacío → include=false', () => {
    const row: ManualRow = { ...BASE_ROW, costoEmpresa: '' };
    expect(manualRowToPayrollRow(row).include).toBe(false);
  });

  it('costoEmpresa = 0 → include=false', () => {
    const row: ManualRow = { ...BASE_ROW, costoEmpresa: '0,00' };
    expect(manualRowToPayrollRow(row).include).toBe(false);
  });

  it('costoEmpresa = "0.00" → include=false', () => {
    const row: ManualRow = { ...BASE_ROW, costoEmpresa: '0.00' };
    expect(manualRowToPayrollRow(row).include).toBe(false);
  });
});

describe('manualRowToPayrollRow — submit falla si falta mes/año', () => {
  it('yearMonth vacío → include=false', () => {
    const row: ManualRow = { ...BASE_ROW, yearMonth: '' };
    expect(manualRowToPayrollRow(row).include).toBe(false);
  });

  it('yearMonth resultante "desconocido" → include=false', () => {
    const row: ManualRow = { ...BASE_ROW, yearMonth: '' };
    expect(manualRowToPayrollRow(row).yearMonth).toBe('desconocido');
  });
});

describe('manualRowToPayrollRow — datos reales de marzo', () => {
  it('Pablo Camacho: include=true con coste 1.696,55', () => {
    const pablo = manualRowToPayrollRow(BASE_ROW);
    expect(pablo.include).toBe(true);
    expect(pablo.netAmount).toBe('1696.55');
    expect(pablo.totalAmount).toBe('1696.55');
    expect(pablo.counterpartyName).toBe('CAMACHO CARRION PABLO');
    expect(pablo.yearMonth).toBe('2026-03');
  });

  it('Alfonso Arias: include=true con coste 1.369,00', () => {
    const alfRow: ManualRow = {
      id: 2,
      counterpartyName: 'ARIAS EPIFANIO ALFONSO',
      yearMonth: '2026-03',
      costoEmpresa: '1.369,00',
      liquidoPercibir: '1.000,00',
      totalDevengado: '1.369,00',
      totalDeducciones: '369,00',
      irpfPct: '',
      notes: '',
    };
    const alfonso = manualRowToPayrollRow(alfRow);
    expect(alfonso.include).toBe(true);
    expect(alfonso.netAmount).toBe('1369.00');
    expect(alfonso.counterpartyName).toBe('ARIAS EPIFANIO ALFONSO');
  });

  it('txId usa formato payroll:{slug}:{YYYY-MM}', () => {
    const pablo = manualRowToPayrollRow(BASE_ROW);
    expect(pablo.txId).toBe('payroll:camacho-carrion-pablo:2026-03');
  });

  it('issueDate es el primer día del mes', () => {
    expect(manualRowToPayrollRow(BASE_ROW).issueDate).toBe('2026-03-01');
  });

  it('notes incluye "Entrada manual"', () => {
    expect(manualRowToPayrollRow(BASE_ROW).notes).toContain('Entrada manual');
  });

  it('notas opcionales vacías no generan warnings', () => {
    const row: ManualRow = { ...BASE_ROW, liquidoPercibir: '', irpfPct: '' };
    const result = manualRowToPayrollRow(row);
    expect(result.include).toBe(true);
    expect(result.warning).toBeNull();
  });
});

// ── normalizeAmount ───────────────────────────────────────────────────────────

describe('normalizeAmount — formato español', () => {
  it('convierte formato español con miles (1.696,55) → 1696.55', () => {
    expect(normalizeAmount('1.696,55')).toBe('1696.55');
  });

  it('convierte formato sin miles con coma (1369,00) → 1369.00', () => {
    expect(normalizeAmount('1369,00')).toBe('1369.00');
  });

  it('acepta punto decimal estándar (1696.55) → 1696.55', () => {
    expect(normalizeAmount('1696.55')).toBe('1696.55');
  });

  it('cadena vacía → 0.00', () => {
    expect(normalizeAmount('')).toBe('0.00');
  });

  it('cero → 0.00', () => {
    expect(normalizeAmount('0,00')).toBe('0.00');
  });
});
