/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest.js');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/src/**/__tests__/client/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(@t3-oss|@neondatabase|drizzle-orm|better-auth|@better-auth)/)',
      ],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/__tests__/server/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(@t3-oss|@neondatabase|drizzle-orm|better-auth|@better-auth)/)',
      ],
    },
    {
      displayName: 'fuzz',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/__tests__/fuzz/**/*.fuzz.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(@t3-oss|@neondatabase|drizzle-orm|better-auth|@better-auth)/)',
      ],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/layout.tsx',
    '!src/**/page.tsx',
    '!src/db/schema/**',
    '!src/lib/env.ts',
    '!src/lib/auth.ts',
    '!src/lib/db.ts',
  ],
};

module.exports = createJestConfig(config);
