import { AutomationDealAlertAcknowledgement } from '@/lib/schemas/automationDeal';
import { pendingAutomationDealAlertLevel } from '@/lib/utils/automation-deal-alerts';

describe('pendingAutomationDealAlertLevel', () => {
  it.each<[number, number, number | null]>([
    [69, 0, null],
    [70, 0, 70],
    [79, 70, null],
    [80, 70, 80],
    [100, 80, 100],
    [100, 100, null],
  ])('progreso %i con watermark %i devuelve %s', (progress, acknowledged, expected) => {
    expect(pendingAutomationDealAlertLevel(progress, acknowledged)).toBe(expected);
  });

  it('repite un aviso pendiente hasta que Discord lo confirma', () => {
    expect(pendingAutomationDealAlertLevel(80, 70)).toBe(80);
    expect(pendingAutomationDealAlertLevel(80, 70)).toBe(80);
    expect(pendingAutomationDealAlertLevel(80, 80)).toBeNull();
  });
});

describe('AutomationDealAlertAcknowledgement', () => {
  it.each([70, 80, 100])('acepta el nivel %i', (level) => {
    expect(AutomationDealAlertAcknowledgement.safeParse({ level }).success).toBe(true);
  });

  it.each([0, 69, 90, 101])('rechaza el nivel %i', (level) => {
    expect(AutomationDealAlertAcknowledgement.safeParse({ level }).success).toBe(false);
  });
});
