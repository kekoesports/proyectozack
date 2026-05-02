// Synthetic gate verification — DO NOT MERGE.
// Deliberately violates @typescript-eslint/no-explicit-any to confirm CI rejects
// strict-rule violations. Expected: `npm run lint` exits non-zero in CI.
// See .scratch/eslint-strict-activation/issues/07-synthetic-gate-verification.md

const x: any = 1;
void x;
