/**
 * Backfill `files` table from legacy `invoices.fileUrl` / `invoices.filePath`.
 *
 * Idempotent — running twice is safe:
 *  - skips invoices already linked via `invoice_file_id`
 *  - matches by `(related_type='invoice', related_id, url)` to avoid duplicating files
 *
 * Run with: `npm run migrate:invoice-files`
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq, isNull, isNotNull, sql as drizzleSql } from 'drizzle-orm';

import { invoices, files } from '../src/db/schema';

// Load .env.local manually
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  /* ignore */
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = neon(url);
const db = drizzle(client);

function inferMime(filename: string | null): string | null {
  if (!filename) return null;
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

function deriveName(path: string | null, urlValue: string): string {
  const source = path ?? urlValue;
  try {
    const segments = source.split('/');
    const last = segments[segments.length - 1] ?? source;
    const cleaned = last.split('?')[0] ?? last;
    return cleaned.length > 0 && cleaned.length <= 250 ? cleaned : 'invoice-attachment';
  } catch {
    return 'invoice-attachment';
  }
}

async function main(): Promise<void> {
  const candidates = await db
    .select({
      id: invoices.id,
      fileUrl: invoices.fileUrl,
      filePath: invoices.filePath,
      createdByUserId: invoices.createdByUserId,
      kind: invoices.kind,
    })
    .from(invoices)
    .where(and(isNotNull(invoices.fileUrl), isNull(invoices.invoiceFileId)));

  console.log(`Found ${candidates.length} invoice(s) needing backfill.`);

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const inv of candidates) {
    if (!inv.fileUrl) {
      skipped += 1;
      continue;
    }

    // Look up an existing file row by (relatedType, relatedId, url) to avoid duplicates.
    const existing = await db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.relatedType, 'invoice'),
          eq(files.relatedId, inv.id),
          eq(files.url, inv.fileUrl),
        ),
      )
      .limit(1);

    let fileId: number;
    if (existing.length > 0 && existing[0]) {
      fileId = existing[0].id;
    } else {
      const name = deriveName(inv.filePath, inv.fileUrl);
      const mime = inferMime(name);
      const inserted = await db
        .insert(files)
        .values({
          name,
          type: 'invoice',
          mime: mime ?? null,
          url: inv.fileUrl,
          path: inv.filePath ?? null,
          relatedType: 'invoice',
          relatedId: inv.id,
          uploadedByUserId: inv.createdByUserId ?? null,
        })
        .returning({ id: files.id });
      const [row] = inserted;
      if (!row) {
        skipped += 1;
        continue;
      }
      fileId = row.id;
      created += 1;
    }

    await db.update(invoices).set({ invoiceFileId: fileId, updatedAt: new Date() }).where(eq(invoices.id, inv.id));
    linked += 1;
  }

  // Sanity check
  const [{ count: orphanCount }] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(invoices)
    .where(and(isNotNull(invoices.fileUrl), isNull(invoices.invoiceFileId)));

  console.log(`Created ${created} new file row(s).`);
  console.log(`Linked ${linked} invoice(s).`);
  console.log(`Skipped ${skipped} candidate(s).`);
  console.log(`Remaining unlinked invoices with fileUrl: ${orphanCount}.`);

  if (orphanCount > 0) {
    console.error('FAIL: backfill incomplete.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
