import { env } from '../../src/lib/env.ts';
import { closeDbPool } from '../../src/lib/db.ts';
import { readContacts } from './read.mjs';
import { sheetClient, syncContacts } from './sheets.mjs';
try {
  const api = await sheetClient({ sheet: env.CREATOR_APPLICATIONS_SHEET_ID,
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY });
  console.log(JSON.stringify(await syncContacts(api, await readContacts(), async () => {}, true)));
} catch { console.error('Contact preview failed'); process.exitCode = 1; }
finally { await closeDbPool(); }
