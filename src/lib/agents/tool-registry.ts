import type { AnyAgentToolDefinition } from './types';

/**
 * Registro de tools.
 *
 * Dos ideas sostienen la seguridad de este módulo:
 *
 * 1. **Lo que no está registrado no existe.** Si el modelo pide `deleteAll`,
 *    `getTool` devuelve `null` y la ejecución para ahí. No hay ruta dinámica,
 *    ni resolución por nombre construido, ni `eval`.
 * 2. **Cada agente tiene su propia allowlist.** Estar registrada no basta:
 *    Guardian no alcanza las tools de finanzas aunque existan y aunque el rol
 *    del actor tuviera permiso.
 *
 * El registro se congela al construirse. Una tool no se añade en caliente ni
 * se le cambia la clase de acción desde la UI: eso es un PR.
 */

export class AgentToolRegistry {
  private readonly tools: ReadonlyMap<string, AnyAgentToolDefinition>;
  /** slug de agente → nombres de tool permitidos. */
  private readonly allowlists: ReadonlyMap<string, ReadonlySet<string>>;

  constructor(
    tools: readonly AnyAgentToolDefinition[],
    allowlists: Readonly<Record<string, readonly string[]>>,
  ) {
    const mapa = new Map<string, AnyAgentToolDefinition>();
    for (const tool of tools) {
      if (mapa.has(tool.name)) {
        throw new Error(`agent-tool-registry: tool duplicada '${tool.name}'`);
      }
      if (tool.actionClass === 'forbidden') {
        // Una tool `forbidden` registrada es una contradicción: la clase existe
        // para nombrar lo que NO tiene implementación. Si alguien escribe uno,
        // el fallo debe ser al arrancar, no al ejecutarse.
        throw new Error(`agent-tool-registry: '${tool.name}' es forbidden y no puede registrarse`);
      }
      mapa.set(tool.name, tool);
    }

    const listas = new Map<string, ReadonlySet<string>>();
    for (const [slug, nombres] of Object.entries(allowlists)) {
      for (const nombre of nombres) {
        if (!mapa.has(nombre)) {
          throw new Error(
            `agent-tool-registry: la allowlist de '${slug}' cita '${nombre}', que no existe`,
          );
        }
      }
      listas.set(slug, new Set(nombres));
    }

    this.tools = mapa;
    this.allowlists = listas;
  }

  /** `null` si no existe. Nunca lanza: un nombre inventado es un caso normal. */
  getTool(name: string): AnyAgentToolDefinition | null {
    return this.tools.get(name) ?? null;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Sin allowlist, el agente no alcanza ninguna tool. Fail-closed. */
  isAllowedForAgent(agentSlug: string, toolName: string): boolean {
    return this.allowlists.get(agentSlug)?.has(toolName) ?? false;
  }

  /** Las tools de un agente, para construir el prompt. */
  listForAgent(agentSlug: string): readonly AnyAgentToolDefinition[] {
    const permitidas = this.allowlists.get(agentSlug);
    if (!permitidas) return [];
    return [...permitidas].map((n) => this.tools.get(n)).filter((t): t is AnyAgentToolDefinition => t !== undefined);
  }

  listAll(): readonly AnyAgentToolDefinition[] {
    return [...this.tools.values()];
  }

  get size(): number {
    return this.tools.size;
  }
}

/**
 * Descripción de las tools de un agente para el prompt.
 *
 * Es orientación para el modelo, no un control: que una tool no aparezca aquí
 * no impide pedirla, y que aparezca no autoriza a ejecutarla. Los controles
 * están en el executor.
 */
export function describeToolsForPrompt(tools: readonly AnyAgentToolDefinition[]): string {
  if (tools.length === 0) return 'No tienes ninguna herramienta disponible.';
  return tools
    .map((t) => `- ${t.name} (v${t.version}, ${t.actionClass}): ${t.description}`)
    .join('\n');
}
