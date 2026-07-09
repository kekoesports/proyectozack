// Generador del fixture XLSX sintético para tests del parser del Libro Mayor.
// Ejecutar con: node scripts/libro-mayor-generate-xlsx-fixture.mjs
//
// Reproduce la estructura Sage/Contasol "Cuentas corrientes" a partir del
// fixture JSON en `src/features/libro-mayor/__fixtures__/sample-ledger.json`.
// El XLSX resultante se escribe junto al JSON.

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'src/features/libro-mayor/__fixtures__');

const json = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'sample-ledger.json'), 'utf-8'));

const fmtAmount = (n) => n.toFixed(2).replace('.', ',');
const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const rows = [
  ['Cuentas corrientes.'],
  [`Empresa: ${json.metadata.empresa}`],
  [`Período: de ${fmtDate(json.metadata.periodoFrom)} a ${fmtDate(json.metadata.periodoTo)}`],
  [`Fecha: ${fmtDate(json.metadata.fecha)}`],
  ['Cuenta', 'Descripción', 'Punt.', 'Fecha', 'Concepto', 'Documento', 'Debe', 'Haber', 'Saldo', 'Contrapartida'],
];

for (const acc of json.accounts) {
  rows.push([acc.code, acc.name, null, null, null, null, null, null, null, null]);
  if (acc.saldoAnterior !== 0) {
    const debe = acc.saldoAnterior > 0 ? acc.saldoAnterior : 0;
    const haber = acc.saldoAnterior < 0 ? -acc.saldoAnterior : 0;
    rows.push([null, null, null, null, 'Saldos anteriores', null, fmtAmount(debe), fmtAmount(haber), fmtAmount(acc.saldoAnterior), null]);
  }
  for (const m of acc.movements) {
    rows.push([
      null, null, null,
      fmtDate(m.date),
      m.concept,
      m.document || null,
      fmtAmount(m.debe),
      fmtAmount(m.haber),
      fmtAmount(m.saldo),
      m.contrapartida || null,
    ]);
  }
  rows.push([null, null, null, null, 'Total cuenta', null, fmtAmount(acc.totalDebe), fmtAmount(acc.totalHaber), fmtAmount(acc.totalSaldo), null]);
}

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Cuentas corrientes');

const outPath = path.join(FIXTURES_DIR, 'sample-ledger.xlsx');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(outPath, buf);

console.log(`✓ Generado ${outPath}`);
console.log(`  Filas escritas: ${rows.length}`);
console.log(`  Cuentas: ${json.accounts.length}`);
