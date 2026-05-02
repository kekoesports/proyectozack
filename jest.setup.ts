import '@testing-library/jest-dom';

// @t3-oss/env-nextjs is ESM-only and validates process.env at module load.
// Bypass it in tests with a Proxy that reads through to process.env at access
// time — this preserves the existing pattern of `process.env.X = 'mock'` in
// per-test setup, while keeping prod code on `import { env } from '@/lib/env'`.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RESEND_API_KEY = 're_test_000000000000000000000000000000';
process.env.BETTER_AUTH_SECRET = 'test-secret-32-chars-minimum-padding-xx';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

jest.mock('@/lib/env', () => ({
  env: new Proxy(
    {},
    {
      get(_target, key: string) {
        return process.env[key];
      },
    },
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Headers()),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
    has: jest.fn(() => false),
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn: (...a: unknown[]) => unknown) => fn),
  unstable_noStore: jest.fn(),
}));

// superjson is ESM-only — mock it in Jest (CJS) environments.
// tRPC uses it only for serialization over the wire; callers work fine without it.
jest.mock('superjson', () => ({
  default: {
    serialize: (v: unknown) => ({ json: v, meta: undefined }),
    deserialize: (v: { json: unknown }) => v.json,
    stringify: (v: unknown) => JSON.stringify(v),
    parse: (v: string): unknown => JSON.parse(v) as unknown,
  },
}));
