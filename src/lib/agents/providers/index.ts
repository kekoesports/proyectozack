import { env } from '@/lib/env';

import type { AgentModelProvider } from '../model-provider';
import { GeminiAgentModelProvider } from './gemini-provider';
import { NullAgentModelProvider } from './null-provider';
import { XaiAgentModelProvider } from './xai-provider';

export { FakeAgentModelProvider } from './fake-provider';
export { GeminiAgentModelProvider } from './gemini-provider';
export { NullAgentModelProvider } from './null-provider';
export { XaiAgentModelProvider } from './xai-provider';

/**
 * Elige el proveedor de un agente.
 *
 * Sin clave, `NullAgentModelProvider`: el runtime arranca y falla en cerrado
 * en el momento de generar, no al importar el módulo. Durante el rollout solo
 * La definición persistida decide entre Gemini y xAI. Sin la clave concreta
 * del proveedor, el runtime falla en cerrado sin afectar a otros agentes.
 */
export function resolveAgentModelProvider(providerName: string, modelName: string | null): AgentModelProvider {
  if (providerName === 'gemini') {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return new NullAgentModelProvider('GEMINI_API_KEY ausente para el agente configurado con Gemini.');
    return new GeminiAgentModelProvider(apiKey, modelName ?? env.GEMINI_MODEL ?? 'gemini-3.6-flash');
  }
  if (providerName === 'xai') {
    const apiKey = env.XAI_API_KEY;
    if (!apiKey) return new NullAgentModelProvider('XAI_API_KEY ausente para el agente configurado con xAI.');
    return new XaiAgentModelProvider(apiKey, modelName ?? env.XAI_MODEL ?? 'grok-4.3');
  }
  return new NullAgentModelProvider();
}
