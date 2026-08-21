/**
 * FV.4 — fija el contravalor en euros de las facturas en divisa distinta al euro.
 *
 * Para cada fila sin `eur_equivalent` pide a Frankfurter (datos del BCE) el tipo
 * de SU fecha de emisión y lo guarda junto al contravalor. El tipo de la fecha de
 * operación es el que vale fiscalmente, así que se congela en la fila: no se
 * recalcula después aunque el mercado se mueva.
 *
 *   npx tsx scripts/backfill-fx-rates.ts            → dry-run, no escribe
 *   npx tsx scripts/backfill-fx-rates.ts --aplicar  → escribe
 *
 * Idempotente: solo toca filas con `eur_equivalent IS NULL`. Se puede ejecutar
 * tantas veces como haga falta, y conviene hacerlo cada vez que se emita o
 * registre una factura en divisa.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

function loadEnvLocal(): void {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // sin .env.local — se usa el entorno
  }
}
loadEnvLocal();

type Pendiente = {
  readonly tabla: 'invoices' | 'issued_invoices';
  readonly id: number;
  readonly issueDate: string;
  readonly currency: string;
  readonly totalAmount: number;
  readonly ref: string;
};

/** Tipo BCE de una fecha: EUR que vale UNA unidad de `currency`. */
async function rateOn(currency: string, isoDate: string): Promise<{ rate: number; date: string } | null> {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/${isoDate}?base=${encodeURIComponent(currency)}&symbols=EUR`,
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

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está definida');
  const aplicar = process.argv.includes('--aplicar');
  console.log(`base: ${new URL(url).host}`);
  console.log(aplicar ? 'modo: APLICAR\n' : 'modo: dry-run — no se escribe nada\n');
  const sql = neon(url);

  const emitidas = await sql`
    SELECT id, issue_date::text AS issue_date, currency, total_amount, invoice_number
    FROM issued_invoices
    WHERE currency <> 'EUR' AND eur_equivalent IS NULL
    ORDER BY issue_date`;
  const internas = await sql`
    SELECT id, issue_date::text AS issue_date, currency, total_amount, concept
    FROM invoices
    WHERE currency <> 'EUR' AND eur_equivalent IS NULL
    ORDER BY issue_date`;

  const pendientes: Pendiente[] = [
    ...emitidas.map((r) => ({
      tabla: 'issued_invoices' as const,
      id: Number(r.id),
      issueDate: String(r.issue_date),
      currency: String(r.currency),
      totalAmount: Number(r.total_amount),
      ref: String(r.invoice_number),
    })),
    ...internas.map((r) => ({
      tabla: 'invoices' as const,
      id: Number(r.id),
      issueDate: String(r.issue_date),
      currency: String(r.currency),
      totalAmount: Number(r.total_amount),
      ref: String(r.concept).slice(0, 40),
    })),
  ];

  if (pendientes.length === 0) {
    console.log('✔ no hay filas en divisa sin contravalor — nada que hacer');
    return;
  }

  console.log(`── ${pendientes.length} fila(s) en divisa sin contravalor\n`);
  let totalEur = 0;
  let sinTipo = 0;

  for (const p of pendientes) {
    const r = await rateOn(p.currency, p.issueDate);
    if (r === null) {
      sinTipo += 1;
      console.log(`   ✖ ${p.tabla} #${p.id}  ${p.issueDate}  ${p.totalAmount} ${p.currency}  — sin tipo disponible`);
      continue;
    }
    const eur = Math.round(p.totalAmount * r.rate * 100) / 100;
    totalEur += eur;
    const nota = r.date !== p.issueDate ? `  (tipo del ${r.date}: el BCE no publicó el ${p.issueDate})` : '';
    console.log(`   ${p.tabla} #${p.id}  ${p.issueDate}  ${p.totalAmount} ${p.currency} → ${eur.toFixed(2)} €  @ ${r.rate}${nota}`);
    console.log(`       ${p.ref}`);

    if (aplicar) {
      if (p.tabla === 'issued_invoices') {
        await sql`
          UPDATE issued_invoices
             SET fx_rate = ${String(r.rate)}, fx_rate_date = ${r.date},
                 eur_equivalent = ${String(eur.toFixed(2))}, updated_at = now()
           WHERE id = ${p.id} AND eur_equivalent IS NULL`;
      } else {
        await sql`
          UPDATE invoices
             SET fx_rate = ${String(r.rate)}, fx_rate_date = ${r.date},
                 eur_equivalent = ${String(eur.toFixed(2))}, updated_at = now()
           WHERE id = ${p.id} AND eur_equivalent IS NULL`;
      }
    }
  }

  console.log(`\n── contravalor total: ${totalEur.toFixed(2)} €`);
  const nominal = pendientes.reduce((a, p) => a + p.totalAmount, 0);
  console.log(`   antes se sumaban 1:1 como ${nominal.toFixed(2)} € → diferencia ${(nominal - totalEur).toFixed(2)} €`);
  if (sinTipo > 0) console.log(`   ⚠ ${sinTipo} fila(s) sin tipo: siguen sin contravalor y el desglose las marcará`);
  if (!aplicar) console.log('\nDry-run. Añade --aplicar para escribir.');
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('✖', err instanceof Error ? err.message : err);
    process.exit(1);
  });
