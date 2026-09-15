/* eslint-disable @typescript-eslint/no-require-imports */
const createJestConfig = require('next/jest.js')({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/server/editorial-channel-isolation.test.fixture.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
});
