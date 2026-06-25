/**
 * Tests para la lógica de clasificación de gastos (expenseGroup / expenseSubtype).
 * Cubre: constantes del schema, compatibilidad subtipo-grupo, legacy filter.
 */
import {
  EXPENSE_GROUPS,
  EXPENSE_GROUP_LABELS,
  EXPENSE_SUBTYPES,
  EXPENSE_SUBTYPES_CAMPAIGN,
  EXPENSE_SUBTYPES_OPERATIONAL,
  EXPENSE_SUBTYPE_LABELS,
} from '@/lib/schemas/invoice';

describe('EXPENSE_GROUPS', () => {
  it('tiene exactamente 2 valores', () => {
    expect(EXPENSE_GROUPS).toHaveLength(2);
  });

  it('contiene campaign_direct y operational', () => {
    expect(EXPENSE_GROUPS).toContain('campaign_direct');
    expect(EXPENSE_GROUPS).toContain('operational');
  });

  it('todos los grupos tienen label', () => {
    for (const g of EXPENSE_GROUPS) {
      expect(EXPENSE_GROUP_LABELS[g]).toBeTruthy();
    }
  });
});

describe('EXPENSE_SUBTYPES', () => {
  it('contiene todos los subtipos de campaign_direct', () => {
    for (const s of EXPENSE_SUBTYPES_CAMPAIGN) {
      expect(EXPENSE_SUBTYPES).toContain(s);
    }
  });

  it('contiene todos los subtipos de operational', () => {
    for (const s of EXPENSE_SUBTYPES_OPERATIONAL) {
      expect(EXPENSE_SUBTYPES).toContain(s);
    }
  });

  it('total = campaign_direct + operational', () => {
    expect(EXPENSE_SUBTYPES).toHaveLength(
      EXPENSE_SUBTYPES_CAMPAIGN.length + EXPENSE_SUBTYPES_OPERATIONAL.length,
    );
  });

  it('todos los subtipos tienen label', () => {
    for (const s of EXPENSE_SUBTYPES) {
      expect(EXPENSE_SUBTYPE_LABELS[s]).toBeTruthy();
    }
  });
});

describe('compatibilidad subtipo ↔ grupo', () => {
  it('subtipos de campaign no están en operational', () => {
    for (const s of EXPENSE_SUBTYPES_CAMPAIGN) {
      expect(EXPENSE_SUBTYPES_OPERATIONAL).not.toContain(s);
    }
  });

  it('subtipos de operational no están en campaign', () => {
    for (const s of EXPENSE_SUBTYPES_OPERATIONAL) {
      expect(EXPENSE_SUBTYPES_CAMPAIGN).not.toContain(s);
    }
  });

  it('pago_talento solo es válido para campaign_direct', () => {
    expect(EXPENSE_SUBTYPES_CAMPAIGN).toContain('pago_talento');
    expect(EXPENSE_SUBTYPES_OPERATIONAL).not.toContain('pago_talento');
  });

  it('gestoria solo es válido para operational', () => {
    expect(EXPENSE_SUBTYPES_OPERATIONAL).toContain('gestoria');
    expect(EXPENSE_SUBTYPES_CAMPAIGN).not.toContain('gestoria');
  });
});

describe('legacy filter — gastos sin expenseGroup', () => {
  type MockInvoice = {
    expenseGroup: string | null;
    campaignId: number | null;
  };

  function isLegacyOperational(inv: MockInvoice): boolean {
    return inv.expenseGroup === 'operational' ||
      (inv.expenseGroup === null && inv.campaignId === null);
  }

  function isNoClasificado(inv: MockInvoice): boolean {
    return inv.expenseGroup === null && inv.campaignId !== null;
  }

  it('gasto sin expenseGroup ni campaignId → legacy operational', () => {
    expect(isLegacyOperational({ expenseGroup: null, campaignId: null })).toBe(true);
  });

  it('gasto con expenseGroup=operational → operational', () => {
    expect(isLegacyOperational({ expenseGroup: 'operational', campaignId: null })).toBe(true);
  });

  it('gasto sin expenseGroup pero con campaignId → sin clasificar', () => {
    expect(isNoClasificado({ expenseGroup: null, campaignId: 5 })).toBe(true);
    expect(isLegacyOperational({ expenseGroup: null, campaignId: 5 })).toBe(false);
  });

  it('gasto con expenseGroup=campaign_direct → NO es operational', () => {
    expect(isLegacyOperational({ expenseGroup: 'campaign_direct', campaignId: 5 })).toBe(false);
  });
});
