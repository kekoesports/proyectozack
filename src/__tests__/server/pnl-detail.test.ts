/**
 * Tests de lógica pura para getFinancePnL / FinancePnLResult.
 * Prueba `classifyExpenseRow` — función pura exportada de pnlDetail.ts.
 * No accede a la DB.
 */
import { classifyExpenseRow } from '@/lib/queries/financeDashboard/pnlDetail';

describe('classifyExpenseRow — campaign_direct', () => {
  it('expenseGroup=campaign_direct → campaign_direct', () => {
    expect(classifyExpenseRow('campaign_direct', null)).toBe('campaign_direct');
  });

  it('expenseGroup=campaign_direct con campaignId → campaign_direct', () => {
    expect(classifyExpenseRow('campaign_direct', 42)).toBe('campaign_direct');
  });
});

describe('classifyExpenseRow — operational (explícito y legacy)', () => {
  it('expenseGroup=operational → operational', () => {
    expect(classifyExpenseRow('operational', null)).toBe('operational');
  });

  it('legacy: expenseGroup=null + campaignId=null → operational', () => {
    expect(classifyExpenseRow(null, null)).toBe('operational');
  });

  it('expenseGroup=operational con campaignId → operational', () => {
    expect(classifyExpenseRow('operational', 5)).toBe('operational');
  });
});

describe('classifyExpenseRow — unclassified', () => {
  it('expenseGroup=null + campaignId presente → unclassified', () => {
    expect(classifyExpenseRow(null, 1)).toBe('unclassified');
  });

  it('expenseGroup=null + campaignId=0 → unclassified (0 es truthy como id)', () => {
    // campaignId=0 no es null → entra en unclassified
    expect(classifyExpenseRow(null, 0)).toBe('unclassified');
  });
});

describe('classifyExpenseRow — invariante de exhaustividad', () => {
  it('todos los buckets cubiertos: campaign_direct | operational | unclassified', () => {
    const cases: Array<[string | null, number | null, string]> = [
      ['campaign_direct', null,  'campaign_direct'],
      ['operational',     null,  'operational'],
      [null,              null,  'operational'],
      [null,              99,    'unclassified'],
    ];
    for (const [group, cId, expected] of cases) {
      expect(classifyExpenseRow(group, cId)).toBe(expected);
    }
  });
});
