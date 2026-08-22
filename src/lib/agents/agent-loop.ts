import { checkBudgetAndLimits, estimateCostMicros, type BudgetSnapshot } from './budget';
import { MAX_TOOL_CALLS_POR_TURNO, type AgentModelMessage, type AgentModelProvider } from './model-provider';
import { executeAgentToolCall, type ToolExecutorDeps } from './tool-executor';
import { describeToolsForPrompt } from './tool-registry';
import type {
  AgentRunLimits,
  AgentToolContext,
  AgentToolExecutionResult,
  ErasedAgentTool,
} from './types';

/**
 * El ciclo de una ejecución: pensar, pedir herramientas, ver resultados,
 * repetir hasta terminar o hasta chocar con un límite.
 *
 * Vive separado del worker a propósito. Aquí no hay base de datos, ni lease, ni
 * reintentos: entran dependencias, sale un resultado. Eso permite probar los
 * límites anti-loop, el presupuesto y la parada por aprobación sin levantar
 * Postgres, y deja a PR 3 el trabajo de persistir lo que este bucle produce.
 *
 * Tres cosas se comprueban en **cada vuelta**, no al empezar:
 *
 * - el presupuesto, porque el gasto ocurre durante la ejecución;
 * - los turnos y llamadas, porque el bucle es donde se desbocan;
 * - la cancelación, porque una ejecución que ya nadie quiere debe parar en el
 *   siguiente punto seguro y no al final.
 */

export type AgentLoopEvent =
  | { readonly kind: 'model_turn'; readonly index: number; readonly text: string; readonly toolCallCount: number }
  | { readonly kind: 'tool_result'; readonly toolName: string; readonly result: AgentToolExecutionResult }
  | {
      readonly kind: 'usage';
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly estimatedCostMicros: number;
      readonly pricingUnknown: boolean;
      /**
       * De qué proveedor y modelo salió el gasto.
       *
       * Van en el evento y no se leen de la definición del agente porque son
       * cosas distintas: la definición dice con qué modelo **debería** correr,
       * y esto dice con cuál corrió. Difieren en cuanto alguien cambia el
       * modelo con ejecuciones en vuelo, y entonces el informe de coste por
       * modelo atribuiría el gasto al equivocado.
       */
      readonly provider: string;
      readonly model: string | null;
    };

export type AgentLoopOutcome =
  | { readonly status: 'completed'; readonly finalText: string; readonly turns: number }
  | { readonly status: 'waiting_approval'; readonly actionHash: string; readonly toolName: string; readonly turns: number }
  | { readonly status: 'stopped'; readonly reason: string; readonly detail: string; readonly turns: number }
  | { readonly status: 'failed'; readonly code: string; readonly message: string; readonly turns: number };

export type AgentLoopDeps = {
  readonly provider: AgentModelProvider;
  readonly tools: readonly ErasedAgentTool[];
  readonly executor: ToolExecutorDeps;
  readonly limits: AgentRunLimits;
  readonly getBudgetSnapshot: () => Promise<BudgetSnapshot>;
  /** Notifica cada paso para que el worker lo persista. */
  readonly onEvent: (event: AgentLoopEvent) => Promise<void>;
  readonly now: () => Date;
  readonly maxOutputTokens?: number;
};

export type AgentLoopInput = {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly ctx: AgentToolContext;
};

const MAX_OUTPUT_TOKENS_DEFECTO = 2_048;

export async function runAgentLoop(
  deps: AgentLoopDeps,
  input: AgentLoopInput,
): Promise<AgentLoopOutcome> {
  const inicio = deps.now();
  const mensajes: AgentModelMessage[] = [{ role: 'user', content: input.userMessage }];

  const systemPrompt = [
    input.systemPrompt,
    '',
    'HERRAMIENTAS DISPONIBLES:',
    describeToolsForPrompt(deps.tools),
    '',
    'Pide una herramienta solo cuando necesites datos que no tengas. Los datos vivos',
    'se consultan siempre; no los recuerdes de ejecuciones anteriores.',
  ].join('\n');

  let turnos = 0;
  let llamadas = 0;
  let ultimoTexto = '';

  // El límite de vueltas del bucle es `maxTurns`, pero el `while (true)` con
  // salidas explícitas se lee peor y esconde el caso de "salió por arriba".
  for (;;) {
    // 1. ¿Queda margen? Presupuesto, turnos, llamadas y duración, en ese orden.
    const margen = checkBudgetAndLimits(
      await deps.getBudgetSnapshot(),
      { modelTurns: turnos, toolCalls: llamadas, startedAt: inicio },
      deps.limits,
      deps.now(),
    );
    if (!margen.ok) {
      return { status: 'stopped', reason: margen.reason, detail: margen.detail, turns: turnos };
    }

    // 2. ¿Sigue viva? La cancelación es cooperativa: se mira entre pasos, nunca
    //    a mitad de una tool que podría estar escribiendo.
    if (!(await deps.executor.isRunActive())) {
      return { status: 'stopped', reason: 'run_cancelled', detail: 'La ejecución fue cancelada.', turns: turnos };
    }

    // 3. Turno de modelo.
    const respuesta = await deps.provider.generate({
      systemPrompt,
      messages: mensajes,
      tools: deps.tools,
      maxOutputTokens: deps.maxOutputTokens ?? MAX_OUTPUT_TOKENS_DEFECTO,
      signal: input.ctx.signal,
    });

    turnos += 1;

    if (!respuesta.ok) {
      return {
        status: 'failed',
        code: respuesta.error.code,
        message: respuesta.error.message,
        turns: turnos,
      };
    }

    const turno = respuesta.turn;
    ultimoTexto = turno.text || ultimoTexto;

    await deps.onEvent({
      kind: 'model_turn',
      index: turnos,
      text: turno.text,
      toolCallCount: turno.toolCalls.length,
    });

    // 4. Consumo. Si el proveedor no informa de tokens, no se estima: se anota
    //    como desconocido y el presupuesto pasa a ser un mínimo, no una cifra.
    if (turno.usage) {
      const coste = estimateCostMicros(turno.model, turno.usage.inputTokens, turno.usage.outputTokens);
      await deps.onEvent({
        kind: 'usage',
        inputTokens: turno.usage.inputTokens,
        outputTokens: turno.usage.outputTokens,
        estimatedCostMicros: coste.estimatedCostMicros,
        pricingUnknown: coste.pricingUnknown,
        provider: turno.provider,
        model: turno.model,
      });
    }

    // 5. Sin herramientas pedidas, el turno es la respuesta final.
    if (turno.toolCalls.length === 0) {
      return { status: 'completed', finalText: turno.text, turns: turnos };
    }

    mensajes.push({ role: 'assistant', content: turno.text });

    // 6. Ejecutar lo que pidió. El tope por turno ya lo aplicó el normalizador
    //    del proveedor; aquí se respeta además el límite global de la ejecución.
    for (const llamada of turno.toolCalls.slice(0, MAX_TOOL_CALLS_POR_TURNO)) {
      if (llamadas >= deps.limits.maxToolCalls) {
        return {
          status: 'stopped',
          reason: 'max_tool_calls_reached',
          detail: `${llamadas}/${deps.limits.maxToolCalls} llamadas`,
          turns: turnos,
        };
      }

      const resultado = await executeAgentToolCall(deps.executor, input.ctx, {
        toolName: llamada.toolName,
        rawInput: llamada.input,
        providerCallId: llamada.id,
      });
      llamadas += 1;

      await deps.onEvent({ kind: 'tool_result', toolName: llamada.toolName, result: resultado });

      // Una acción que espera firma humana congela la ejecución entera. No se
      // sigue con las demás llamadas del turno: el modelo debe volver a
      // razonar cuando sepa si le dijeron que sí.
      if (resultado.status === 'waiting_approval') {
        return {
          status: 'waiting_approval',
          actionHash: resultado.actionHash,
          toolName: llamada.toolName,
          turns: turnos,
        };
      }

      // Si no se sabe si una escritura ocurrió, la ejecución para aquí. Seguir
      // significaría que el modelo razona sobre un estado del mundo que nadie
      // conoce, y el siguiente paso podría intentar arreglar algo que no está
      // roto —o duplicar lo que sí pasó—.
      if (resultado.status === 'indeterminate') {
        return {
          status: 'stopped',
          reason: 'tool_outcome_unknown',
          detail: `${llamada.toolName}: ${resultado.code}`,
          turns: turnos,
        };
      }

      mensajes.push({
        role: 'tool',
        toolName: llamada.toolName,
        toolCallId: llamada.id,
        content: contenidoParaModelo(resultado),
      });
    }
  }
}

/**
 * Qué ve el modelo de cada resultado.
 *
 * Un bloqueo se le cuenta —necesita saber que no puede usar esa herramienta
 * para no insistir— pero sin detalles del control que lo paró: el motivo
 * interno no le ayuda a resolver la tarea y sí le ayudaría a buscarle la
 * vuelta.
 */
function contenidoParaModelo(resultado: AgentToolExecutionResult): Record<string, unknown> {
  switch (resultado.status) {
    case 'succeeded':
      return { ok: true, data: resultado.output };
    case 'simulated':
      return { ok: true, simulated: true, note: 'Modo shadow: la acción no se ha ejecutado.' };
    case 'blocked':
      return { ok: false, error: 'No tienes permiso para ejecutar esta herramienta.' };
    case 'failed':
      return { ok: false, error: 'La herramienta falló. Continúa sin esos datos o termina.' };
    case 'indeterminate':
      // Se le dice explícitamente que NO lo repita. Un modelo que ve "falló"
      // vuelve a intentarlo, y aquí eso podría duplicar una acción que ya
      // ocurrió.
      return {
        ok: false,
        error: 'No se sabe si la acción llegó a ocurrir. NO la repitas: una persona debe comprobarlo.',
      };
    case 'waiting_approval':
      return { ok: false, error: 'Pendiente de aprobación humana.' };
  }
}
