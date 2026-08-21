import type {
  AgentModelProvider,
  AgentModelRequest,
  AgentModelResult,
  AgentModelTurn,
} from '../model-provider';

/**
 * Proveedor guionizado para tests y CI.
 *
 * Existe para que ninguna prueba llame a Gemini: los tests del runtime deben
 * ser deterministas y funcionar sin clave. Se le pasa la lista de turnos que
 * debe devolver, en orden, y registra las peticiones recibidas para poder
 * comprobar qué se le mandó —incluido si el prompt llevaba algo que no debía—.
 */
export class FakeAgentModelProvider implements AgentModelProvider {
  readonly name = 'fake';

  private readonly turnos: AgentModelTurn[];
  private readonly peticiones: AgentModelRequest[] = [];
  private indice = 0;

  constructor(turnos: readonly Partial<AgentModelTurn>[]) {
    this.turnos = turnos.map((t) => ({
      text: t.text ?? '',
      toolCalls: t.toolCalls ?? [],
      usage: t.usage ?? { inputTokens: 100, outputTokens: 50, cachedInputTokens: null },
      model: t.model ?? 'fake-model',
      provider: 'fake',
      finishReason: t.finishReason ?? ((t.toolCalls?.length ?? 0) > 0 ? 'tool_calls' : 'stop'),
    }));
  }

  async generate(request: AgentModelRequest): Promise<AgentModelResult> {
    this.peticiones.push(request);
    const turno = this.turnos[this.indice];
    this.indice += 1;

    if (!turno) {
      // Quedarse sin guion es un fallo del test, no del código bajo prueba:
      // significa que el runtime dio más vueltas de las previstas.
      return {
        ok: false,
        error: {
          code: 'provider_error',
          message: `FakeAgentModelProvider: sin turno para la llamada ${this.indice}`,
          retryable: false,
        },
      };
    }

    return { ok: true, turn: turno };
  }

  /** Peticiones recibidas, para inspeccionarlas en los asertos. */
  get requests(): readonly AgentModelRequest[] {
    return this.peticiones;
  }

  get callCount(): number {
    return this.indice;
  }
}
