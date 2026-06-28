import {
  calcTotal,
  estimateGross,
  makeTxId,
  generateHistoricalRows,
  generateRecurringTemplates,
  summarize,
  DEFAULT_HISTORICAL_CONFIG,
  monthLabel,
} from '@/lib/finance/setup2026/generator';

describe('calcTotal', () => {
  it('calcula total con IVA sin retención', () => {
    expect(calcTotal(100, 21, 0)).toBe('121.00');
  });

  it('calcula total con retención (gestoría sin IVA)', () => {
    // net * (1 + (0 - 15) / 100) = net * 0.85
    expect(calcTotal(1000, 0, 15)).toBe('850.00');
  });

  it('calcula total con IVA 21% y retención 15%', () => {
    // net * (1 + (21 - 15) / 100) = net * 1.06
    expect(calcTotal(500, 21, 15)).toBe('530.00');
  });

  it('devuelve el neto cuando IVA y retención son 0', () => {
    expect(calcTotal(250, 0, 0)).toBe('250.00');
  });
});

describe('estimateGross', () => {
  it('calcula bruto de Pablo al 22% IRPF', () => {
    const gross = estimateGross(1000, 22);
    expect(gross).toBeCloseTo(1282.05, 1);
  });

  it('calcula bruto de Alfonso al 6% IRPF', () => {
    const gross = estimateGross(1000, 6);
    expect(gross).toBeCloseTo(1063.83, 1);
  });

  it('retorna el neto cuando irpf=0', () => {
    expect(estimateGross(1500, 0)).toBe(1500);
  });

  it('retorna el neto cuando irpf>=100 (guard)', () => {
    expect(estimateGross(1000, 100)).toBe(1000);
  });
});

describe('makeTxId', () => {
  it('incluye persona cuando se proporciona', () => {
    expect(makeTxId('nomina_socio', 'pablo', '2026-01')).toBe('setup2026:nomina_socio:pablo:2026-01');
  });

  it('omite persona cuando es null', () => {
    expect(makeTxId('gestoria', null, '2026-03')).toBe('setup2026:gestoria:2026-03');
  });

  it('es estable (mismos inputs → mismo output)', () => {
    const id1 = makeTxId('cuota_autonomo', 'alfonso', '2026-06');
    const id2 = makeTxId('cuota_autonomo', 'alfonso', '2026-06');
    expect(id1).toBe(id2);
  });

  it('distingue por mes', () => {
    const jan = makeTxId('gestoria', null, '2026-01');
    const feb = makeTxId('gestoria', null, '2026-02');
    expect(jan).not.toBe(feb);
  });
});

describe('generateHistoricalRows — estructura básica', () => {
  const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG);

  it('genera filas para los dos socios (pablo y alfonso)', () => {
    const pablo = rows.filter((r) => r.personKey === 'pablo');
    const alfonso = rows.filter((r) => r.personKey === 'alfonso');
    expect(pablo.length).toBeGreaterThan(0);
    expect(alfonso.length).toBeGreaterThan(0);
  });

  it('todos los txIds empiezan por setup2026:', () => {
    for (const row of rows) {
      expect(row.txId).toMatch(/^setup2026:/);
    }
  });

  it('todos los txIds son únicos', () => {
    const ids = rows.map((r) => r.txId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos los rows tienen expenseGroup operational', () => {
    for (const row of rows) {
      expect(row.expenseGroup).toBe('operational');
    }
  });

  it('cuota_autonomo tiene vatPct=0.00 y withholdingPct=0.00', () => {
    const autonomo = rows.filter((r) => r.expenseSubtype === 'cuota_autonomo');
    for (const row of autonomo) {
      expect(row.vatPct).toBe('0.00');
      expect(row.withholdingPct).toBe('0.00');
    }
  });

  it('nomina_socio usa estimateGross para netAmount', () => {
    const nominas = rows.filter((r) => r.expenseSubtype === 'nomina_socio');
    expect(nominas.length).toBeGreaterThan(0);
    for (const row of nominas) {
      const net = Number(row.netAmount);
      expect(net).toBeGreaterThan(1000); // siempre bruto > neto (con IRPF > 0)
    }
  });
});

describe('generateHistoricalRows — totales por mes/subtipo', () => {
  it('summarize cuenta exactamente las filas include=true', () => {
    const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG);
    const s = summarize(rows);
    const includedCount = rows.filter((r) => r.include).length;
    expect(s.invoiceCount).toBe(includedCount);
  });

  it('grandTotal es la suma de totalAmount de todas las filas included', () => {
    const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG);
    const expected = rows
      .filter((r) => r.include)
      .reduce((acc, r) => acc + Number(r.totalAmount), 0);
    const s = summarize(rows);
    expect(s.grandTotal).toBeCloseTo(expected, 1);
  });

  it('ebitdaImpact es la suma de netAmount de filas included', () => {
    const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG);
    const expected = rows
      .filter((r) => r.include)
      .reduce((acc, r) => acc + Number(r.netAmount), 0);
    const s = summarize(rows);
    expect(s.ebitdaImpact).toBeCloseTo(expected, 1);
  });

  it('totalBySubtype tiene clave nomina_socio cuando hay nóminas', () => {
    const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG);
    const s = summarize(rows);
    expect(s.totalBySubtype).toHaveProperty('nomina_socio');
  });
});

describe('generateRecurringTemplates', () => {
  const gestoria = { ...DEFAULT_HISTORICAL_CONFIG.gestoria, startDate: '2026-07-01' };
  const seguro = { ...DEFAULT_HISTORICAL_CONFIG.seguro, startDate: '2026-07-01' };
  const templates = generateRecurringTemplates(gestoria, seguro);

  it('genera exactamente 2 templates', () => {
    expect(templates).toHaveLength(2);
  });

  it('gestoria tiene vatPct y withholdingPct del config', () => {
    const g = templates.find((t) => t.expenseSubtype === 'gestoria');
    expect(g).toBeDefined();
    expect(g!.vatPct).toBe(DEFAULT_HISTORICAL_CONFIG.gestoria.vatPct);
  });

  it('seguro_medico tiene vatPct=0.00 y withholdingPct=0.00', () => {
    const s = templates.find((t) => t.expenseSubtype === 'seguro_medico');
    expect(s).toBeDefined();
    expect(s!.vatPct).toBe('0.00');
    expect(s!.withholdingPct).toBe('0.00');
  });

  it('las keys empiezan por setup2026:recurring:', () => {
    for (const t of templates) {
      expect(t.key).toMatch(/^setup2026:recurring:/);
    }
  });
});

describe('summarize — filas parcialmente excluidas', () => {
  it('ignora filas con include=false', () => {
    const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG).map((r, i) =>
      i === 0 ? { ...r, include: false } : r,
    );
    const s = summarize(rows);
    const expected = rows.filter((r) => r.include).length;
    expect(s.invoiceCount).toBe(expected);
  });

  it('devuelve grandTotal=0 si todas están excluidas', () => {
    const rows = generateHistoricalRows(DEFAULT_HISTORICAL_CONFIG).map((r) => ({
      ...r,
      include: false,
    }));
    const s = summarize(rows);
    expect(s.grandTotal).toBe(0);
    expect(s.invoiceCount).toBe(0);
  });
});

describe('monthLabel', () => {
  it('formatea enero correctamente', () => {
    expect(monthLabel('2026-01')).toBe('ene 2026');
  });

  it('formatea junio correctamente', () => {
    expect(monthLabel('2026-06')).toBe('jun 2026');
  });
});
