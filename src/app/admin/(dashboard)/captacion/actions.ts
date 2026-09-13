'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { IntakeControl } from '@/lib/schemas/creatorIntake';
import { env } from '@/lib/env';

export async function controlIntakeAction(_previous: { ok: boolean; error?: string }, formData: FormData) {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  if (!env.CREATOR_INTAKE_ENABLED) return { ok: false, error: 'La captación todavía no está activada.' };
  const parsed = IntakeControl.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Datos de conversación inválidos.' };
  try {
    if (parsed.data.action === 'resume') {
      const detail = await creatorIntake.detail(parsed.data.id);
      if (detail?.conversation.channel === 'whatsapp' && detail.conversation.accountId.startsWith('waha:')
        && !env.CREATOR_INTAKE_WHATSAPP_CHATS?.split(',').includes(detail.conversation.chatId)) {
        return { ok: false, error: 'Este contacto está fuera del piloto de respuestas. Se conserva para atención personal.' };
      }
    }
    const result = await creatorIntake.control(parsed.data.id, parsed.data.version, parsed.data.action, session.user.id);
    revalidatePath('/admin/captacion');
    return result;
  } catch {
    return { ok: false, error: 'No se ha podido actualizar. Recarga la conversación antes de volver a intentarlo.' };
  }
}
