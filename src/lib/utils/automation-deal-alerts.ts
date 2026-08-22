export const AUTOMATION_DEAL_ALERT_LEVELS = [70, 80, 100] as const;

export type AutomationDealAlertLevel = typeof AUTOMATION_DEAL_ALERT_LEVELS[number];

export function pendingAutomationDealAlertLevel(
  progressPct: number,
  acknowledgedLevel: number,
): AutomationDealAlertLevel | null {
  const reachedLevel = progressPct >= 100
    ? 100
    : progressPct >= 80
      ? 80
      : progressPct >= 70
        ? 70
        : null;

  return reachedLevel !== null && reachedLevel > acknowledgedLevel
    ? reachedLevel
    : null;
}
