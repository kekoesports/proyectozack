import { ocrTextToPayrollRow } from '@/lib/parsers/payrollOcr';

// Fixtures basados en OCR real del PDF ELEVATEX MARZO 2026
// Los nombres y cifras son datos reales — NO loggear en tests

const PABLO_TEXT = `CAMACHO CARRION PABLO
Empresa: ELEVATEX SL
01 MAR 26 AL 31 MAR 26
NIF: XXXXXXXXX
TRABAJADOR/A: CAMACHO CARRION PABLO

TOTAL DEVENGADO 1.696,55
TOTAL DEDUCCIONES 696,55
LIQUIDO A PERCIBIR
1.000,00

COSTE EMPRESA 1.696,55

I.R.P.F. 22,49
`;

const ALFONSO_TEXT = `ARIAS EPIFANIO ALFONSO
Empresa: ELEVATEX SL
01 MAR 26 AL 31 MAR 26

TOTAL DEVENGADO 1.369,00
TOTAL DEDUCCIONES 369,00
LIQUIDO A PERCIBIR
1.000,00

COSTE EMPRESA 1.369,00
`;

const MISSING_NAME_TEXT = `01 MAR 26 AL 31 MAR 26

TOTAL DEVENGADO 1.500,00
COSTE EMPRESA 1.500,00
LIQUIDO A PERCIBIR
1.200,00
`;

const MISSING_COSTE_TEXT = `GARCIA PEREZ JUAN
01 MAR 26 AL 31 MAR 26

TOTAL DEVENGADO 1.500,00
LIQUIDO A PERCIBIR
1.200,00
`;

const MISSING_PERIOD_TEXT = `GARCIA PEREZ JUAN

TOTAL DEVENGADO 1.500,00
COSTE EMPRESA 1.500,00
LIQUIDO A PERCIBIR
1.200,00
`;

describe('ocrTextToPayrollRow — datos reales de Pablo Camacho (marzo)', () => {
  const pablo = ocrTextToPayrollRow(PABLO_TEXT, 1, 'NOMINA ELEVATEX MARZO 2026.pdf');

  it('include=true cuando todos los campos obligatorios están presentes', () => {
    expect(pablo.include).toBe(true);
  });

  it('extrae el nombre correctamente', () => {
    expect(pablo.counterpartyName).toBe('CAMACHO CARRION PABLO');
  });

  it('extrae el período como 2026-03', () => {
    expect(pablo.yearMonth).toBe('2026-03');
  });

  it('extrae coste empresa 1.696,55 → 1696.55', () => {
    expect(pablo.netAmount).toBe('1696.55');
    expect(pablo.totalAmount).toBe('1696.55');
  });

  it('txId usa formato payroll:{slug}:{YYYY-MM}', () => {
    expect(pablo.txId).toBe('payroll:camacho-carrion-pablo:2026-03');
  });

  it('issueDate es el primer día del mes', () => {
    expect(pablo.issueDate).toBe('2026-03-01');
  });

  it('notes contiene "OCR — revisar"', () => {
    expect(pablo.notes).toContain('OCR — revisar');
  });

  it('warning=null cuando todos los campos están presentes', () => {
    expect(pablo.warning).toBeNull();
  });
});

describe('ocrTextToPayrollRow — Alfonso Arias (marzo)', () => {
  const alfonso = ocrTextToPayrollRow(ALFONSO_TEXT, 2, 'NOMINA ELEVATEX MARZO 2026.pdf');

  it('include=true con coste 1.369,00', () => {
    expect(alfonso.include).toBe(true);
    expect(alfonso.netAmount).toBe('1369.00');
  });

  it('extrae el nombre de ARIAS EPIFANIO ALFONSO', () => {
    expect(alfonso.counterpartyName).toBe('ARIAS EPIFANIO ALFONSO');
  });
});

describe('ocrTextToPayrollRow — campos obligatorios faltantes', () => {
  it('sin nombre → include=false, warning menciona trabajador', () => {
    const row = ocrTextToPayrollRow(MISSING_NAME_TEXT, 1, 'test.pdf');
    expect(row.include).toBe(false);
    expect(row.warning).toContain('trabajador');
  });

  it('sin coste empresa → include=false', () => {
    const row = ocrTextToPayrollRow(MISSING_COSTE_TEXT, 1, 'test.pdf');
    expect(row.include).toBe(false);
    expect(row.netAmount).toBe('0.00');
  });

  it('sin período → include=false, yearMonth="desconocido"', () => {
    const row = ocrTextToPayrollRow(MISSING_PERIOD_TEXT, 1, 'test.pdf');
    expect(row.include).toBe(false);
    expect(row.yearMonth).toBe('desconocido');
  });
});
