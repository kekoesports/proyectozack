import type {
  AgentModelProvider,
  AgentModelRequest,
  AgentModelResult,
} from '../model-provider';

/**
 * Proveedor por defecto cuando no hay modelo configurado.
 *
 * Falla en cerrado y **sin pedir ninguna tool**: un fallback que improvisara
 * llamadas sería peor que no tener modelo. Devuelve un error marcado como no
 * reintentable, porque no hay nada que reintentar hasta que alguien configure
 * la clave.
 */
export class NullAgentModelProvider implements AgentModelProvider {
  readonly name = 'null';

  async generate(_request: AgentModelRequest): Promise<AgentModelResult> {
    void _request;
    return {
      ok: false,
      error: {
        code: 'provider_unavailable',
        message: 'No hay proveedor de modelo configurado (GEMINI_API_KEY ausente).',
        retryable: false,
      },
    };
  }
}
