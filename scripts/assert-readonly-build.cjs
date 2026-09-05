'use strict';

// BuildKit mounts a dedicated minimal build env; never the general production env.
// Match the app driver's connection-string behaviour, including URL options precedence.
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
(async () => {
  try {
    if (!process.env.DATABASE_URL || !process.env.PGOPTIONS?.includes('default_transaction_read_only=on')) {
      throw new Error('readonly_build_required');
    }
    await client.connect();
    const result = await client.query('SHOW default_transaction_read_only');
    if (result.rows[0]?.default_transaction_read_only !== 'on') throw new Error('readonly_build_not_enforced');
    process.stdout.write('Build database connection: read-only verified.\n');
  } catch {
    process.stderr.write('Build stopped: read-only database preflight failed. No credential values are logged.\n');
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => { process.exitCode = 1; });
  }
})();
