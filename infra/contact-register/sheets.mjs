import { createSign } from 'node:crypto';
import { z } from 'zod';
import { contactCells, join, text } from './model.mjs';

const Values = z.object({ values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).optional() });
const Token = z.object({ access_token: z.string().min(1) });
const Metadata = z.object({ sheets: z.array(z.object({ properties: z.object({ sheetId: z.number(), title: z.string(), gridProperties: z.object({ rowCount: z.number(), columnCount: z.number() }) }) })) });
export async function sheetClient(config) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const input = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: config.email,
    scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signer = createSign('RSA-SHA256'); signer.update(input);
  const assertion = `${input}.${signer.sign(config.key.replace(/\\n/g, '\n')).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('contacts-google-auth-failed');
  const token = Token.safeParse(await response.json());
  if (!token.success) throw Error('contacts-google-auth-shape');
  return async (path, body) => {
    const result = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheet)}${path}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token.data.access_token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
    });
    if (!result.ok) throw Error(`contacts-sheets-http-${result.status}`);
    return result.json();
  };
}

export async function syncContacts(api, contacts, beforeWrite = async () => {}, dryRun = false) {
  const metadata = Metadata.safeParse(await api('?fields=sheets.properties'));
  if (!metadata.success) throw Error('contacts-sheet-metadata-invalid');
  const sheet = metadata.data.sheets.find((s) => s.properties.title === 'Candidaturas')?.properties;
  if (!sheet || sheet.gridProperties.columnCount < 30) throw Error('contacts-sheet-template-not-ready');
  const read = async () => {
    const result = Values.safeParse(await api(`/values/${encodeURIComponent("'Candidaturas'!A4:AD" + sheet.gridProperties.rowCount)}?valueRenderOption=FORMULA`));
    if (!result.success) throw Error('contacts-sheet-values-invalid');
    return result.data.values ?? [];
  };
  const original = await read();
  if (original[0]?.[0] !== 'ID' || original[0]?.[18] !== 'Origen') throw Error('contacts-sheet-header-mismatch');
  const rows = original.slice(1).map((row) => [...row]);
  const matchRow = (contact) => rows.findIndex((row) => contact.ids.includes(text(row[0]))
    || text(row[28]).split('\n').some((id) => contact.ids.includes(id))
    || (contact.email && text(row[3]).toLowerCase() === contact.email)
    || (contact.phone && text(row[19]) === contact.phone));
  const destinations = contacts.map(matchRow);
  const ambiguous = new Set(destinations.filter((row, index) => row >= 0 && destinations.indexOf(row) !== index));
  const changes = [];
  let appended = 0;
  let updated = 0;
  for (const [position, contact] of contacts.entries()) {
    const match = destinations[position];
    // A stored sheet identity can be ambiguous after manual or historical edits.
    // Never let two different current contacts overwrite one row in the same batch.
    if (ambiguous.has(match)) continue;
    const idx = match < 0 ? rows.length : match;
    const prior = rows[idx] ?? [];
    const values = contactCells(contact);
    if (match >= 0 && prior[29] === values[29]) continue;
    const changed = [];
    for (let col = 0; col < 30; col++) {
      // Human status, review notes and previously verified observations are owned
      // by the team, never overwritten by passive registration.
      if (match >= 0 && [0, 1, 12, 14, 15, 16, 17].includes(col)) continue;
      let next = values[col];
      if (match >= 0 && col < 18 && text(prior[col])) {
        if ([2, 5, 6, 7, 8, 9, 10, 11, 13].includes(col)) next = join([...text(prior[col]).split('\n'), ...text(next).split('\n')]);
        else continue;
      }
      if (col === 28 && match >= 0) next = join([prior[0], prior[col], next]);
      if (text(prior[col]) === text(next)) continue;
      const value = { userEnteredValue: { stringValue: text(next) } };
      // Clear old row-specific links when changing their displayed value.
      if ([7, 8, 9, 10, 20, 21, 27].includes(col)) {
        value.textFormatRuns = [];
        value.userEnteredFormat = { textFormat: {} };
        if (/^https:\/\/[^\s]+$/.test(text(next))) value.userEnteredFormat.textFormat.link = { uri: text(next) };
      }
      changed.push({ updateCells: { range: { sheetId: sheet.sheetId, startRowIndex: idx + 4, endRowIndex: idx + 5, startColumnIndex: col, endColumnIndex: col + 1 },
        rows: [{ values: [value] }], fields: 'userEnteredValue' + (value.userEnteredFormat ? ',textFormatRuns,userEnteredFormat.textFormat.link' : '') } });
      prior[col] = next;
    }
    if (!changed.length) continue;
    if (match < 0) {
      appended++;
      changes.push({ repeatCell: { range: { sheetId: sheet.sheetId, startRowIndex: idx + 4, endRowIndex: idx + 5, startColumnIndex: 0, endColumnIndex: 30 },
        cell: { userEnteredFormat: { textFormat: { fontFamily: 'Arial', fontSize: 10, foregroundColor: { red: .12, green: .16, blue: .21 } }, verticalAlignment: 'MIDDLE', wrapStrategy: 'CLIP' } },
        fields: 'userEnteredFormat.textFormat,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy' } });
      changes.push({ setDataValidation: { range: { sheetId: sheet.sheetId, startRowIndex: idx + 4, endRowIndex: idx + 5, startColumnIndex: 15, endColumnIndex: 16 },
        rule: { condition: { type: 'ONE_OF_LIST', values: ['Nuevo', 'Revisar', 'Interesante', 'Contactado', 'Descartado'].map((userEnteredValue) => ({ userEnteredValue })) }, strict: true, showCustomUi: true } } });
    } else updated++;
    rows[idx] = prior;
    changes.push(...changed);
  }
  if (!changes.length) return { discovered: contacts.length, appended: 0, updated: 0, verified: true, conflicts: ambiguous.size };
  if (dryRun) {
    const changedColumns = {};
    for (const change of changes) if (change.updateCells) {
      const col = change.updateCells.range.startColumnIndex;
      changedColumns[col] = (changedColumns[col] ?? 0) + 1;
    }
    const cells = changes.filter((c) => c.updateCells).map((c) => c.updateCells.range);
    const uniqueCells = new Set(cells.map((c) => `${c.startRowIndex}:${c.startColumnIndex}`));
    return { discovered: contacts.length, appended, updated, changedColumns,
      touchedRows: new Set(cells.map((c) => c.startRowIndex)).size,
      repeatedCells: cells.length - uniqueCells.size, conflicts: ambiguous.size, verified: false, dryRun: true };
  }
  if (rows.length + 4 > sheet.gridProperties.rowCount) {
    changes.unshift({ appendDimension: { sheetId: sheet.sheetId, dimension: 'ROWS', length: rows.length + 104 - sheet.gridProperties.rowCount } });
    sheet.gridProperties.rowCount = rows.length + 104;
  }
  await beforeWrite(original);
  // Single atomic update: a failed API request cannot leave an identity half-written.
  await api(':batchUpdate', { requests: changes });
  const result = await read();
  for (const request of changes) {
    const update = request.updateCells;
    if (!update) continue;
    const row = update.range.startRowIndex - 3;
    const col = update.range.startColumnIndex;
    if (text(result[row]?.[col]) !== update.rows[0].values[0].userEnteredValue.stringValue) throw Error('contacts-sheet-readback-mismatch');
  }
  return { discovered: contacts.length, appended, updated, verified: true, conflicts: ambiguous.size };
}
