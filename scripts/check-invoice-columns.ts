import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '.env.local') });
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('issued_invoices', 'issuer_companies')
    ORDER BY table_name, ordinal_position
  `;
  rows.forEach((r) => console.log(`${r.table_name}.${r.column_name}  ${r.data_type}  nullable=${r.is_nullable}`));
  process.exit(0);
}
main().catch(console.error);
