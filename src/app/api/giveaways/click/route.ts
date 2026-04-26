import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { codeClicks, creatorCodes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { codeId?: unknown; action?: unknown };
    const codeId = typeof body.codeId === 'number' ? body.codeId : null;
    const action = body.action === 'copy' || body.action === 'cta' ? body.action : null;

    if (!codeId || !action) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const [code] = await db
      .select({ talentId: creatorCodes.talentId, brandName: creatorCodes.brandName })
      .from(creatorCodes)
      .where(eq(creatorCodes.id, codeId));

    if (!code) return NextResponse.json({ ok: false }, { status: 404 });

    await db.insert(codeClicks).values({
      codeId,
      talentId: code.talentId,
      brandName: code.brandName,
      action,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
