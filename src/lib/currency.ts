// Tipo de cambio USD→EUR fijo. Actualizar manualmente cuando sea necesario.
export const USD_EUR_RATE = 0.92;

const FMT_EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const FMT_USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function fmtCurrency(n: number | string, currency = 'EUR'): string {
  return (currency === 'USD' ? FMT_USD : FMT_EUR).format(Number(n));
}

export function toEUR(n: number | string, currency = 'EUR', rate = USD_EUR_RATE): number {
  return currency === 'USD' ? Number(n) * rate : Number(n);
}
