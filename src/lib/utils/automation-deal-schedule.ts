import type { AutomationDealCreateInput } from '@/lib/schemas/automationDeal';

export type AutomationDealSchedule = {
  readonly startDate: string;
  readonly endDate: string | undefined;
  readonly deliveryDeadline: string | undefined;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDateFromUtc(date: Date): string {
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join('-');
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addCalendarMonths(isoDate: string, months: number): string {
  const [yearRaw, monthRaw, dayRaw] = isoDate.split('-').map(Number);
  const year = yearRaw ?? 0;
  const month = monthRaw ?? 1;
  const day = dayRaw ?? 1;
  const monthIndex = month - 1 + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${pad2(targetMonthIndex + 1)}-${pad2(targetDay)}`;
}

export function resolveAutomationDealSchedule(
  input: Pick<AutomationDealCreateInput, 'startDate' | 'endDate' | 'durationMonths' | 'deliveryDeadline'>,
  now = new Date(),
): AutomationDealSchedule {
  const startDate = input.startDate ?? isoDateFromUtc(addUtcDays(now, 2));
  const endDate = input.endDate ?? (
    input.durationMonths ? addCalendarMonths(startDate, input.durationMonths) : undefined
  );
  return {
    startDate,
    endDate,
    deliveryDeadline: input.deliveryDeadline ?? endDate,
  };
}
