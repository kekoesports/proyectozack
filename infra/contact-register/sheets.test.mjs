import assert from 'node:assert/strict';
import test from 'node:test';
import { syncContacts } from './sheets.mjs';
import { toContact, contactCells } from './model.mjs';

const contact = (id, email) => toContact({ id, createdAt: '2026-09-13T10:00:00Z', name: 'TEST fixture', email, origin: 'WhatsApp', crm: 'https://example.test/contact' });
function fixture(body) {
  const header = Array(30).fill(''); header[0] = 'ID'; header[18] = 'Origen';
  const rows = [header, ...structuredClone(body)];
  let writes = 0;
  const api = async (path, payload) => {
    if (path.startsWith('?')) return { sheets: [{ properties: { sheetId: 1, title: 'Candidaturas', gridProperties: { rowCount: 100, columnCount: 30 } } }] };
    if (!payload) return { values: structuredClone(rows) };
    writes++;
    for (const { updateCells: update } of payload.requests) if (update) {
      const row = update.range.startRowIndex - 3;
      rows[row] ??= Array(30).fill('');
      rows[row][update.range.startColumnIndex] = update.rows[0].values[0].userEnteredValue.stringValue;
    }
    return {};
  };
  return { api, rows, writes: () => writes };
}
test('ambiguous legacy row is preserved instead of repeatedly overwritten', async () => {
  const a = contact('TEST-a', 'a@example.test'); const b = contact('TEST-b', 'b@example.test');
  const row = contactCells(a); row[28] = 'TEST-a\nTEST-b';
  const f = fixture([row]); const before = structuredClone(f.rows);
  const result = await syncContacts(f.api, [a,b]);
  assert.equal(result.conflicts, 1); assert.equal(f.writes(), 0); assert.deepEqual(f.rows, before);
});
test('fresh contact has a confirmed readback and a duplicate run has no effect', async () => {
  const a = contact('TEST-new', 'fresh@example.test'); const f = fixture([]);
  assert.equal((await syncContacts(f.api, [a])).appended, 1);
  assert.equal((await syncContacts(f.api, [a])).updated, 0);
  assert.equal(f.writes(), 1);
  f.rows[1][15] = 'Interesante'; f.rows[1][17] = 'Nota personal';
  a.phone = '+34999000002';
  assert.equal((await syncContacts(f.api, [a])).updated, 1);
  assert.equal(f.rows[1][15], 'Interesante'); assert.equal(f.rows[1][17], 'Nota personal');
  assert.equal(f.rows[1][19], '+34999000002');
});

test('CRM qualification updates the sheet status and keeps source IDs unique', async () => {
  const item = contact('TEST-interest', 'interest@example.test');
  item.status = 'interesante';
  const row = contactCells({ ...item, status: 'nuevo' });
  row[28] = 'TEST-interest\nTEST-interest';
  row[29] = '';
  const f = fixture([row]);

  assert.equal((await syncContacts(f.api, [item])).updated, 1);
  assert.equal(f.rows[1][15], 'Interesante');
  assert.equal(f.rows[1][28], 'TEST-interest');
});
