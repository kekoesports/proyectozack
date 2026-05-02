// Synthetic gate verification — DO NOT MERGE.
// Same `: any` violation as src/_gate-check.ts. The override in eslint.config.mjs
// for `**/__tests__/**/*.{ts,tsx}` should DISABLE no-explicit-any et al, so
// CI lint must NOT flag this file. If it does → override is broken.
// See .scratch/eslint-strict-activation/issues/07-synthetic-gate-verification.md

import { describe, it, expect } from '@jest/globals';

describe('synthetic gate check', () => {
  it('test override allows : any in test files', () => {
    const x: any = 1;
    void x;
    expect(true).toBe(true);
  });
});
