import { requireAnyRole } from '@/lib/auth-guard';
import { listThreadsForUser } from '@/lib/queries/aiAssistant';
import { ChatClient } from '@/features/admin/ai-assistant/components/ChatClient';
import { env } from '@/lib/env';

export const metadata = { title: 'Zack Operaciones — SocialPro Admin' };

export default async function AsistentePage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(
    ['admin', 'admin_limited_tasks', 'manager', 'finance', 'analyst', 'ops', 'talent_manager', 'editor'],
    '/admin/login',
  );

  const threads = await listThreadsForUser(session.user.id);
  const hasApiKey = Boolean(env.GEMINI_API_KEY);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Zack Operaciones</h1>
          <p className="text-sm text-sp-muted mt-0.5">
            Reúne tratos, Creadores Target, prensa, contenido, finanzas y copias de seguridad para ayudarte a priorizar. Solo lectura — no ejecuta cambios.
          </p>
        </div>
        {!hasApiKey && (
          <div className="shrink-0 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
            GEMINI_API_KEY no configurada — el asistente responderá sin IA
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ChatClient initialThreads={threads} contextType="general" />
      </div>
    </div>
  );
}
