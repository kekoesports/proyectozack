import type { Config } from 'drizzle-kit';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL env var required for drizzle-kit');

export default {
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle/',
  dbCredentials: { url: dbUrl },
} satisfies Config;
