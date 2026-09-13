// Operator-only: input and report remain in the mounted private evidence directory.
import { readFile, writeFile } from 'node:fs/promises';
import { db, closeDbPool } from '../src/lib/db.ts';
import { reconcileWahaIdentities } from '../src/lib/intake/reconcile-identity.ts';
try {
  const plan = JSON.parse(await readFile('/evidence/identity-plan.json', 'utf8'));
  const result = await reconcileWahaIdentities(db, plan);
  await writeFile('/evidence/identity-result.json', JSON.stringify({ at: new Date().toISOString(), ...result }), { mode: 0o600 });
  console.log(JSON.stringify(result));
} catch { console.error('Identity reconciliation failed; transaction rolled back.'); process.exitCode = 1; }
finally { await closeDbPool(); }
