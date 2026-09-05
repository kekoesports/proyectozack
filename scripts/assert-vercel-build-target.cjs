'use strict';

// Master is published through the controlled VPS workflow, not the legacy
// Vercel migrate/build/IndexNow chain. No imports, secrets, DB or network here.
// A missing/ambiguous Git ref is not permission to run that chain.
const branch = process.env.VERCEL_GIT_COMMIT_REF;
const validBranch = typeof branch === 'string'
  && branch.length > 0 && branch.length <= 255
  && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)
  && !branch.includes('..') && !branch.includes('//')
  && !branch.endsWith('/') && !branch.endsWith('.') && !branch.endsWith('.lock');
if (!validBranch || branch === 'master' || branch === 'stabilize/socialpro-2026-09-05') {
  process.stderr.write('Legacy Vercel build blocked: use the controlled VPS publication workflow.\n');
  process.exitCode = 1;
}
