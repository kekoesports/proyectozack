import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const r = await db.execute(sql`select 1 as ok, current_database() as dbname, current_user as usr`);
    return NextResponse.json({ ok: true, r });
  } catch (e: unknown) {
    const err = e as { message?: string; cause?: { message?: string; code?: string; sourceError?: unknown } };
    return NextResponse.json({
      ok: false,
      message: err?.message,
      causeMessage: err?.cause?.message,
      causeCode: err?.cause?.code,
      causeSource: String(err?.cause?.sourceError ?? ''),
      hasDBURL: typeof process.env.DATABASE_URL === 'string',
      dbHost: (() => { try { return new URL(process.env.DATABASE_URL!).host; } catch { return null; } })(),
    }, { status: 500 });
  }
}
