export type ExchangeRate = {
  rate: number;
  date: string;        // "YYYY-MM-DD" from BCE — may be 1-2 days old on weekends
  isEstimated: boolean; // true only when API is unreachable; false = real BCE rate
};

const FALLBACK: ExchangeRate = { rate: 0.92, date: '', isEstimated: true };

export async function getUsdEurRate(): Promise<ExchangeRate> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?base=USD&symbols=EUR', {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return FALLBACK;
    const data = await res.json() as { rates?: { EUR?: unknown }; date?: unknown };
    const rate = data?.rates?.EUR;
    const date = data?.date;
    if (typeof rate !== 'number' || typeof date !== 'string') return FALLBACK;
    return { rate, date, isEstimated: false };
  } catch {
    return FALLBACK;
  }
}

// Formats for UI display — safe regardless of weekend gaps or fallback.
// "whitespace-nowrap" should be applied on the wrapping element in the UI.
export function fmtRateLabel({ rate, date, isEstimated }: ExchangeRate): string {
  if (isEstimated) {
    return `USD→EUR ${rate.toFixed(3).replace('.', ',')} (estimado)`;
  }
  const parts = date.split('-');
  const m = parts[1] ?? '01';
  const d = parts[2] ?? '01';
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `USD→EUR ${rate.toFixed(3).replace('.', ',')} · ${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
}
