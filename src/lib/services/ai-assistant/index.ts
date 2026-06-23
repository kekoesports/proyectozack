'server-only';

import { getAiProvider, type AiMessage as ProviderMessage } from './provider';
import { checkGuardrails } from './guardrails';
import { buildSystemPrompt } from './context';
import { runTool, type ToolName, AVAILABLE_TOOLS } from './tools/index';
import type { Role } from '@/lib/auth-guard';
import {
  createThread,
  getThread,
  insertMessage,
  touchThread,
  updateThreadTitle,
  getThreadMessages,
  logToolExecution,
} from '@/lib/queries/aiAssistant';
import { sanitizeToolOutput } from './sanitize';
import type { AiContextTypeKey } from '@/lib/schemas/aiAssistant';
import type { AiMessage } from '@/types';

export type AssistantResponse = {
  readonly threadId: number;
  readonly messageId: number;
  readonly text: string;
  readonly usedAi: boolean;
  readonly blocked?: boolean | undefined;
  readonly error?: string | undefined;
};

type ToolBlock = { readonly name: string; readonly content: string };

// Primera pasada: detecta y ejecuta tool calls; devuelve bloques para la segunda pasada
async function gatherToolResults(
  firstResponseText: string,
  threadId: number,
  userRole: Role,
): Promise<{ readonly hasTools: boolean; readonly blocks: readonly ToolBlock[] }> {
  const toolPattern = /\[TOOL:(\w+)(?::(\{[^}]+\}))?\]/g;
  const matches = [...firstResponseText.matchAll(toolPattern)];

  if (matches.length === 0) return { hasTools: false, blocks: [] };

  const blocks: ToolBlock[] = [];

  for (const match of matches) {
    const toolName = match[1] as ToolName;
    const inputStr = match[2];

    if (!AVAILABLE_TOOLS.includes(toolName)) {
      try {
        await logToolExecution({ threadId, toolName, status: 'blocked', errorMessage: 'not in allowlist' });
      } catch { /* best effort */ }
      continue;
    }

    let input: unknown;
    try {
      input = inputStr ? JSON.parse(inputStr) : undefined;
    } catch {
      input = undefined;
    }

    const result = await runTool({
      name: toolName,
      threadId,
      userRole,
      ...(input !== undefined ? { input } : {}),
    });

    const content = result.ok
      ? JSON.stringify(sanitizeToolOutput(result.data), null, 2)
      : `Error: ${result.error}`;

    blocks.push({ name: toolName, content });
  }

  return { hasTools: blocks.length > 0, blocks };
}

// Convierte mensajes de BD a formato del proveedor Gemini
function toProviderHistory(messages: readonly AiMessage[]): readonly ProviderMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      content: m.content,
    }));
}

// Genera un título automático para el primer mensaje
function deriveTitle(userMessage: string): string {
  const trimmed = userMessage.trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

export async function sendMessage(opts: {
  userId: string;
  userMessage: string;
  threadId?: number;
  contextType?: AiContextTypeKey;
  userRole: Role;
}): Promise<AssistantResponse> {
  const { userId, userMessage, contextType = 'general', userRole } = opts;

  // 1. Guardrails — verificar antes de cualquier operación
  const guardrail = checkGuardrails(userMessage);
  if (guardrail.blocked) {
    // Si hay hilo, guardar el par bloqueado igual (para historial)
    let tid = opts.threadId;
    if (!tid) {
      const thread = await createThread(userId, contextType, deriveTitle(userMessage));
      tid = thread.id;
    }
    await insertMessage(tid, 'user', userMessage);
    const assistantMsg = await insertMessage(tid, 'assistant', guardrail.message, { blocked: true, reason: guardrail.reason });
    await touchThread(tid);
    return { threadId: tid, messageId: assistantMsg.id, text: guardrail.message, usedAi: false, blocked: true };
  }

  // 2. Obtener o crear hilo
  let threadId = opts.threadId;
  if (threadId) {
    const existing = await getThread(threadId, userId);
    if (!existing) {
      // Si no pertenece al usuario, crear uno nuevo
      const thread = await createThread(userId, contextType, deriveTitle(userMessage));
      threadId = thread.id;
    }
  } else {
    const thread = await createThread(userId, contextType, deriveTitle(userMessage));
    threadId = thread.id;
  }

  // 3. Cargar historial de mensajes
  const history = await getThreadMessages(threadId);
  const providerHistory = toProviderHistory(history.slice(-20)); // últimos 20 mensajes

  // 4. Guardar mensaje del usuario
  await insertMessage(threadId, 'user', userMessage);

  // 5. Llamar al proveedor IA (primera pasada)
  // Strip de tokens TOOL del mensaje del usuario para evitar inyección (el original ya está guardado en BD)
  const safeUserMessage = userMessage.replace(/\[TOOL:[^\]]*\]/g, '[solicitud bloqueada]');
  const provider = getAiProvider();
  const systemPrompt = buildSystemPrompt(contextType);
  const firstAiResponse = await provider.chat(systemPrompt, providerHistory, safeUserMessage);

  // 6. Dos pasadas si hay tool calls
  let finalText = firstAiResponse.text;
  let usedAi = firstAiResponse.usedAi;

  if (firstAiResponse.usedAi) {
    const { hasTools, blocks } = await gatherToolResults(firstAiResponse.text, threadId, userRole);

    if (hasTools) {
      // Construir historial actualizado: añadir el turno actual para dar contexto al modelo
      const updatedHistory: readonly ProviderMessage[] = [
        ...providerHistory,
        { role: 'user' as const, content: safeUserMessage },
        { role: 'model' as const, content: firstAiResponse.text },
      ];

      const toolDataSection = blocks
        .map((b) => `=== ${b.name} ===\n${b.content}`)
        .join('\n\n');

      const secondUserMessage =
        `He consultado las herramientas internas del CRM. Estos son los datos reales:\n\n${toolDataSection}\n\n` +
        `Responde ahora al usuario de forma clara y concisa usando únicamente los datos anteriores. ` +
        `No muestres JSON crudo ni tokens internos. Formatea la respuesta en markdown legible.`;

      const secondAiResponse = await provider.chat(systemPrompt, updatedHistory, secondUserMessage);
      finalText = secondAiResponse.text;
      usedAi = true;
    }
  }

  // 7. Guardar respuesta del asistente
  const assistantMsg = await insertMessage(threadId, 'assistant', finalText, {
    usedAi,
    ...(firstAiResponse.error !== undefined ? { error: firstAiResponse.error } : {}),
  });

  // 8. Actualizar hilo (title en primer mensaje, updatedAt)
  if (history.length === 0) {
    await updateThreadTitle(threadId, userId, deriveTitle(userMessage));
  }
  await touchThread(threadId);

  return {
    threadId,
    messageId: assistantMsg.id,
    text: finalText,
    usedAi,
    ...(firstAiResponse.error !== undefined ? { error: firstAiResponse.error } : {}),
  };
}
