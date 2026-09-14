import { mkdir, writeFile } from 'node:fs/promises';
import { env } from '../../src/lib/env.ts';
import { readContacts } from './read.mjs';
import { sheetClient, syncContacts } from './sheets.mjs';

const evidence = '/evidence';
async function run() {
  const api = await sheetClient({ sheet: env.CREATOR_APPLICATIONS_SHEET_ID,
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY });
  const result = await syncContacts(api, await readContacts(), async (rows) => {
    await mkdir(evidence, { recursive: true, mode: 0o700 });
    await writeFile(`${evidence}/before-${Date.now()}.json`, JSON.stringify(rows), { mode: 0o600 });
  });
  const status = { at: new Date().toISOString(), ok: true, ...result };
  await writeFile(`${evidence}/last-result.json`, JSON.stringify(status), { mode: 0o600 });
  console.log(JSON.stringify(status));
}
async function safeRun() {
  try { await run(); } catch (error) {
    const code = error instanceof Error && /^contacts-[a-z0-9-]+$/.test(error.message) ? error.message : 'contact-register-failed';
    console.error(JSON.stringify({ at: new Date().toISOString(), ok: false, error: code }));
    await writeFile(`${evidence}/last-result.json`, JSON.stringify({ at: new Date().toISOString(), ok: false }), { mode: 0o600 });
    if (process.argv.includes('--once')) process.exitCode = 1;
  }
}
await safeRun();
if (!process.argv.includes('--once')) {
  // Deliberately sequential: no concurrent writes and no empty-message replies.
  for (;;) { await new Promise((resolve) => setTimeout(resolve, 300000)); await safeRun(); }
}
