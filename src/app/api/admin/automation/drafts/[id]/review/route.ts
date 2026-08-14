import { type NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth-guard';
import { parseJsonWithSchema } from '@/lib/integrations/request';
import { reviewCommunicationDraft } from '@/lib/queries/automation/drafts';
import { DraftReview, NumericIdParam } from '@/lib/schemas/integrationApi';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAnyRole(['admin', 'admin_limited_tasks', 'manager'], '/admin/login');
  const id = NumericIdParam.safeParse(await context.params);
  if (!id.success) return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
  const parsed = await parseJsonWithSchema(request, DraftReview);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.message }, { status: 400 });
  const draft = await reviewCommunicationDraft(id.data.id, parsed.data, session.user.id);
  if (!draft) {
    return NextResponse.json(
      { success: false, error: 'Borrador inexistente o ya revisado' },
      { status: 409 },
    );
  }
  return NextResponse.json({ success: true, draft });
}
