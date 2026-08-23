import { env } from '@/lib/env';

import type { AgentModelProvider } from '../model-provider';
import { GeminiAgentModelProvider } from './gemini-provider';
import { NullAgentModelProvider } from './null-provider';

export { FakeAgentModelProvider } from './fake-provider';
export { GeminiAgentModelProvider } from './gemini-provider';
export { NullAgentModelProvider } from './null-provider';

/**
 * Elige el proveedor de un agente.
 *
 * Sin clave, `NullAgentModelProvider`: el runtime arranca y falla en cerrado
 * en el momento de generar, no al importar el módulo. Durante el rollout solo
 * Guardian está configurado para Gemini; los otros cinco siguen en null.
 */
export function resolveAgentModelProvider(providerName: string, modelName: string | null): AgentModelProvider {
  if (providerName === 'gemini') {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return new NullAgentModelProvider();
    return new GeminiAgentModelProvider(apiKey, modelName ?? env.GEMINI_MODEL ?? 'gemini-2.5-flash');
  }
  return new NullAgentModelProvider();
}
