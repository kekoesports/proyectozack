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

// ── FV.4 · tipo histórico ───────────────────────────────────────────────────

/**
 * Tipo BCE de una fecha concreta: los EUR que vale UNA unidad de `currency`.
 *
 * Frankfurter sirve el histórico en `/{fecha}` y, si ese día no hubo
 * publicación (fin de semana o festivo del BCE), responde con el día hábil
 * anterior. Por eso se devuelve también la fecha efectiva: sin ella no se puede
 * auditar por qué una factura del sábado salió al tipo del viernes.
 *
 * Devuelve `null` cuando la API no contesta o no trae la divisa, en vez de
 * inventar un tipo: una fila sin contravalor es un aviso visible en el desglose,
 * y un tipo inventado es un número falso que nadie vuelve a mirar.
 */
export async function getRateOn(
  currency: string,
  isoDate: string,
): Promise<{ readonly rate: number; readonly date: string } | null> {
  if (currency === 'EUR') return { rate: 1, date: isoDate };
  try {
    const res = await fetch(
      `https://api.frankfurter.app/${isoDate}?base=${encodeURIComponent(currency)}&symbols=EUR`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { EUR?: unknown }; date?: unknown };
    const rate = data?.rates?.EUR;
    const date = data?.date;
    if (typeof rate !== 'number' || typeof date !== 'string') return null;
    return { rate, date };
  } catch {
    return null;
  }
}

/** Contravalor en EUR de un importe, al tipo de su fecha. `null` si no hay tipo. */
export async function toEurOn(
  amount: number,
  currency: string,
  isoDate: string,
): Promise<{ readonly eur: number; readonly rate: number; readonly rateDate: string } | null> {
  const r = await getRateOn(currency, isoDate);
  if (r === null) return null;
  return { eur: Math.round(amount * r.rate * 100) / 100, rate: r.rate, rateDate: r.date };
}
