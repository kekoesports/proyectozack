'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');
const cwd = path.resolve(__dirname, '../../..');
const eslint = new ESLint({ cwd });

test('guard CommonJS uses a real JS parser and recommended checks, not a TS project exception', async () => {
  const config = await eslint.calculateConfigForFile(path.join(__dirname, 'clients.cjs'));
  assert.equal(config.languageOptions.parser.name, 'espree');
  assert.equal(config.languageOptions.sourceType, 'commonjs');
  assert.equal(config.languageOptions.parserOptions.projectService, false);
  assert.equal(config.rules['no-undef'][0], 2);
  assert.equal(config.rules['no-unused-vars'][0], 2);
  const [result] = await eslint.lintText('const unusedValue = 1; unknownFunction();',
    { filePath: path.join(__dirname, 'synthetic-lint-fixture.cjs') });
  assert.equal(result.fatalErrorCount, 0);
  assert.deepEqual(result.messages.map(x => x.ruleId).sort(), ['no-undef', 'no-unused-vars']);
});
test('the CJS override does not relax strict src TypeScript or other JavaScript paths', async () => {
  const strict = await eslint.calculateConfigForFile(path.join(cwd, 'src/lib/env.ts'));
  assert.equal(strict.languageOptions.parserOptions.projectService, true);
  for (const rule of ['no-explicit-any', 'no-non-null-assertion', 'no-unsafe-assignment',
    'no-unsafe-call', 'no-unsafe-member-access', 'no-unsafe-argument', 'no-unsafe-return',
    'no-misused-promises', 'await-thenable', 'consistent-type-assertions']) {
    assert.equal(strict.rules['@typescript-eslint/' + rule][0], 2);
  }
  const elsewhere = await eslint.calculateConfigForFile(path.join(cwd, 'infra/n8n/other.cjs'));
  assert.equal(elsewhere.languageOptions.parserOptions.projectService, true);
});
