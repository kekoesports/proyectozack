import { buildActionHash } from './action-hash';
import { checkBudget, type BudgetSnapshot } from './budget';
import { checkApprovalUsable, type AgentApprovalSnapshot } from './approval-state';
import { evaluatePolicy, riskLevelForActionClass } from './policy';
import { redactErrorMessage, redactForStorage } from './redaction';
import type { AgentToolRegistry } from './tool-registry';
import type {
  AgentToolCallRequest,
  AgentToolContext,
  AgentToolExecutionResult,
  ErasedAgentTool,
  PreparedAgentToolCall,
} from './types';

/**
 * El punto por el que pasa toda ejecución de tool.
 *
 * Diez comprobaciones antes de que se ejecute una sola línea de la tool, en el
 * orden de docs/agent-os/claude-work-prompt.md §TOOLS. El orden importa: es
 * más barato rechazar un nombre inventado que consultar el presupuesto, y una
 * ejecución cancelada no debe gastar cuota comprobando aprobaciones.
 *
 * Lo que este módulo asume: **nada de lo que dice el modelo**. El nombre de la
 * tool puede no existir, el input puede ser hostil, y la descripción de la
 * tool no protege de nada. La autoridad la ponen el registro, la política,
 * el RBAC del CRM y la firma humana.
 *
 * Las dependencias se inyectan en vez de importarse para que el executor se
 * pueda probar entero sin base de datos ni proveedor de modelo.
 */

export type ToolExecutorDeps = {
  readonly registry: AgentToolRegistry;
  /** Kill switch global, ya resuelto. */
  readonly agentsEnabled: boolean;
  readonly agentStatus: 'active' | 'paused' | 'disabled';
  /**
   * ¿Sigue viva la ejecución? Cubre a la vez la cancelación cooperativa y la
   * pérdida del lease: un worker que ya no es dueño del run no ejecuta nada.
   */
  readonly isRunActive: () => Promise<boolean>;
  readonly getBudgetSnapshot: () => Promise<BudgetSnapshot>;
  /** Aprobación viva para ese hash exacto, si la hay. */
  readonly findApproval: (actionHash: string) => Promise<(AgentApprovalSnapshot & { readonly id: number }) | null>;
  /** Gasta la aprobación. `false` si otro la consumió primero. */
  readonly consumeApproval: (approvalId: number, actionHash: string) => Promise<boolean>;
  /** Llamada anterior con la misma clave de idempotencia. */
  readonly findPreviousCall: (
    idempotencyKey: string,
  ) => Promise<{ readonly status: string; readonly resultJson: Record<string, unknown> | null } | null>;
  /**
   * Registra la llamada **antes** de ejecutarla, en estado `executing`, y
   * devuelve su id.
   *
   * Es un contrato, no una traza: escribir la fila después es lo natural —ya se
   * sabe el resultado— y es exactamente lo que rompe la garantía. Si el worker
   * muere a mitad de la tool, sin fila no queda rastro, `findPreviousCall` no
   * encuentra nada al reanudar y la acción se repite a ciegas. Con la fila
   * escrita antes, el reintento ve un `executing` y se detiene.
   *
   * Opcional: sin ella el executor sigue funcionando (los tests lo usan así),
   * pero entonces la idempotencia entre procesos no está garantizada.
   */
  readonly beginToolCall?: (info: ToolCallRecordInput) => Promise<number>;
  /** Cierra la fila con el desenlace. */
  readonly settleToolCall?: (toolCallId: number, result: AgentToolExecutionResult) => Promise<void>;
  readonly policyVersion: string;
  readonly now: () => Date;
};

export type ToolCallRecordInput = {
  readonly toolName: string;
  readonly toolVersion: string;
  readonly actionClass: ErasedAgentTool['actionClass'];
  readonly inputJson: Record<string, unknown>;
  readonly inputHash: string;
  readonly idempotencyKey: string | null;
  readonly providerCallId: string | null;
};

/** Códigos estables de bloqueo. Viajan a la timeline y a la UI. */
export type ToolBlockCode =
  | 'unknown_tool'
  | 'tool_not_allowed_for_agent'
  | 'run_not_active'
  | 'budget_blocked'
  | 'invalid_tool_input'
  | 'policy_denied'
  | 'approval_consumed_elsewhere'
  | 'tool_timeout'
  | 'tool_failed';

function bloqueo(code: ToolBlockCode, message: string): AgentToolExecutionResult {
  return { status: 'blocked', code, message };
}

/**
 * Ejecuta la tool con un tope de tiempo.
 *
 * El `AbortSignal` llega hasta la tool para que pueda cortar de verdad —una
 * consulta, un fetch—; el `race` está para el caso en que no lo respete. Sin
 * el race, una tool que ignora la señal retiene al worker indefinidamente y se
 * lleva por delante el lease.
 */
async function ejecutarConTimeout(
  tool: ErasedAgentTool,
  call: PreparedAgentToolCall,
  ctx: AgentToolContext,
  timeoutMs: number,
): Promise<
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly timedOut: boolean; readonly error: unknown }
> {
  void tool;
  const abort = new AbortController();
  // La señal del contexto (cancelación del run) y el timeout de la tool se
  // combinan: cualquiera de los dos aborta.
  const alCancelar = (): void => abort.abort();
  ctx.signal.addEventListener('abort', alCancelar, { once: true });

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    const conSeñal: AgentToolContext = { ...ctx, signal: abort.signal };

    const carrera = new Promise<never>((_, reject) => {
      temporizador = setTimeout(() => {
        abort.abort();
        reject(new Error(`timeout tras ${timeoutMs} ms`));
      }, timeoutMs);
    });

    const value = await Promise.race([call.execute(conSeñal), carrera]);
    return { ok: true, value };
  } catch (error) {
    const timedOut = abort.signal.aborted && !ctx.signal.aborted;
    return { ok: false, timedOut, error };
  } finally {
    if (temporizador !== undefined) clearTimeout(temporizador);
    ctx.signal.removeEventListener('abort', alCancelar);
  }
}

export async function executeAgentToolCall(
  deps: ToolExecutorDeps,
  ctx: AgentToolContext,
  request: AgentToolCallRequest,
): Promise<AgentToolExecutionResult> {
  // 1. ¿Existe la tool? Un nombre que el modelo se inventó muere aquí.
  const tool = deps.registry.getTool(request.toolName);
  if (!tool) {
    return bloqueo('unknown_tool', `La herramienta '${request.toolName}' no existe.`);
  }

  // 2. ¿La alcanza ESTE agente? Existir no es lo mismo que estar permitida.
  if (!deps.registry.isAllowedForAgent(ctx.agentSlug, tool.name)) {
    return bloqueo(
      'tool_not_allowed_for_agent',
      `El agente '${ctx.agentSlug}' no tiene '${tool.name}' en su allowlist.`,
    );
  }

  // 3. ¿Sigue viva la ejecución? Cubre cancelación y pérdida de lease.
  if (!(await deps.isRunActive())) {
    return bloqueo('run_not_active', 'La ejecución fue cancelada o perdió el lease.');
  }

  // 4. Validación del input. Antes del hash de acción, porque lo que se firma
  //    es el input ya validado, no lo que escribió el modelo. A partir de aquí
  //    el input tipado vive dentro de `prepared.call`: el executor solo maneja
  //    la versión redactada y las funciones que ya lo llevan dentro.
  const prepared = tool.prepare(request.rawInput);
  if (!prepared.ok) {
    return bloqueo(
      'invalid_tool_input',
      `Argumentos inválidos para '${tool.name}': ${prepared.issues.join('; ')}`,
    );
  }
  const call = prepared.call;
  const inputRedactado = call.redactedInput;

  // 5. Política: kill switch, estado del agente, clase de acción, RBAC y modo.
  const decision = evaluatePolicy({
    agentsEnabled: deps.agentsEnabled,
    agentStatus: deps.agentStatus,
    agentMode: ctx.agentMode,
    actorRole: ctx.actorRole,
    actionClass: tool.actionClass,
    approvalPolicy: tool.approvalPolicy,
    requiredPermission: tool.requiredPermission,
  });

  if (decision.kind === 'deny') {
    return bloqueo('policy_denied', `Acción no permitida (${decision.reason}).`);
  }

  // 6. Shadow: se registra qué habría hecho y con qué argumentos. No se ejecuta.
  if (decision.kind === 'simulate') {
    return {
      status: 'simulated',
      wouldHave: {
        tool: tool.name,
        version: tool.version,
        actionClass: tool.actionClass,
        input: inputRedactado,
        reason: decision.reason,
      },
    };
  }

  // 7. Presupuesto. Después de la política porque simular no cuesta dinero.
  const presupuesto = checkBudget(await deps.getBudgetSnapshot());
  if (!presupuesto.ok) {
    return bloqueo('budget_blocked', `Presupuesto agotado: ${presupuesto.detail}`);
  }

  const actionHash = buildActionHash({
    toolName: tool.name,
    toolVersion: tool.version,
    input: inputRedactado,
    policyVersion: deps.policyVersion,
  });

  // 8. Aprobación humana, cuando la política la exige.
  let approvalId: number | null = null;
  if (decision.kind === 'needs_approval') {
    const aprobacion = await deps.findApproval(actionHash);
    if (!aprobacion) {
      return {
        status: 'waiting_approval',
        actionHash,
        title: `${tool.name} — ${tool.actionClass}`,
        summary: tool.description,
        parametersPreview: {
          ...inputRedactado,
          _riskLevel: riskLevelForActionClass(tool.actionClass),
        },
      };
    }

    const usable = checkApprovalUsable(aprobacion, actionHash, deps.now());
    if (!usable.ok) {
      // Caducada, consumida o de otra acción: se pide una nueva. Nunca se
      // reutiliza una firma que ya no describe lo que va a pasar.
      return {
        status: 'waiting_approval',
        actionHash,
        title: `${tool.name} — ${tool.actionClass}`,
        summary: `${tool.description} (aprobación anterior no utilizable: ${usable.code})`,
        parametersPreview: {
          ...inputRedactado,
          _riskLevel: riskLevelForActionClass(tool.actionClass),
        },
      };
    }
    approvalId = aprobacion.id;
  }

  // 9. Idempotencia. Antes de ejecutar y antes de gastar la aprobación: si el
  //    worker murió después de escribir pero antes de anotar el resultado, al
  //    reanudar encuentra la llamada anterior en vez de repetir el efecto.
  //
  //    Solo un `failed` explícito autoriza a repetir. Cualquier otro estado
  //    —incluido `executing`, que es lo que deja un worker muerto a mitad—
  //    significa que la acción pudo ocurrir, y repetirla es peor que no
  //    hacerla: no hay forma de des-enviar un email.
  const idempotencyKey = call.buildIdempotencyKey ? call.buildIdempotencyKey(ctx) : null;
  if (idempotencyKey) {
    const previa = await deps.findPreviousCall(idempotencyKey);
    if (previa && previa.status === 'succeeded') {
      return {
        status: 'succeeded',
        output: previa.resultJson ?? { _replayed: true },
        durationMs: 0,
      };
    }
    if (previa && previa.status !== 'failed') {
      return {
        status: 'indeterminate',
        code: 'tool_call_in_flight',
        message: `Ya existe una llamada a '${tool.name}' con la misma clave en estado '${previa.status}'. No se repite: requiere revisión humana.`,
        durationMs: 0,
      };
    }
  }

  // 10. Gastar la aprobación. Justo antes de ejecutar y con un UPDATE
  //     condicional detrás: si otro proceso la consumió, aquí se para.
  if (approvalId !== null) {
    const consumida = await deps.consumeApproval(approvalId, actionHash);
    if (!consumida) {
      return bloqueo(
        'approval_consumed_elsewhere',
        'La aprobación ya había sido utilizada. Pide una nueva.',
      );
    }
  }

  // 11. La fila se escribe ANTES de ejecutar, en `executing`. Ver el contrato
  //     en el comentario de `beginToolCall`.
  const toolCallId = deps.beginToolCall
    ? await deps.beginToolCall({
        toolName: tool.name,
        toolVersion: tool.version,
        actionClass: tool.actionClass,
        inputJson: inputRedactado,
        inputHash: actionHash,
        idempotencyKey,
        providerCallId: request.providerCallId ?? null,
      })
    : null;

  const cerrar = async (resultado: AgentToolExecutionResult): Promise<AgentToolExecutionResult> => {
    if (toolCallId !== null && deps.settleToolCall) await deps.settleToolCall(toolCallId, resultado);
    return resultado;
  };

  // 12. Ejecución acotada en el tiempo.
  const inicio = deps.now().getTime();
  const resultado = await ejecutarConTimeout(tool, call, ctx, tool.maxExecutionMs);
  const durationMs = deps.now().getTime() - inicio;

  if (!resultado.ok) {
    if (resultado.timedOut) {
      // Una tool que escribe y se pasa de tiempo NO es un fallo: el `race`
      // devuelve el control, pero la escritura sigue viva y puede completarse.
      // Llamarlo `failed` lo haría reintentable, y el reintento duplicaría un
      // envío que quizá ya salió. Lo que hay aquí es desconocimiento, y se
      // reporta como tal para que lo mire una persona.
      if (idempotencyKey !== null) {
        return cerrar({
          status: 'indeterminate',
          code: 'tool_timeout_indeterminate',
          message: `'${tool.name}' superó su límite de ${tool.maxExecutionMs} ms y escribe: no se sabe si la acción llegó a ocurrir.`,
          durationMs,
        });
      }
      return cerrar({
        status: 'failed',
        code: 'tool_timeout',
        message: `'${tool.name}' superó su límite de ${tool.maxExecutionMs} ms.`,
        durationMs,
      });
    }
    return cerrar({
      status: 'failed',
      code: 'tool_failed',
      message: redactErrorMessage(resultado.error),
      durationMs,
    });
  }

  // 13. Redacción del resultado. Doble pasada a propósito: el redactor propio
  //     de la tool ya se aplicó dentro de `call.execute` —no hay ruta que lo
  //     salte—, y encima pasa el genérico, que no depende de que ese redactor
  //     esté bien escrito.
  const output = redactForStorage(resultado.value);

  return cerrar({ status: 'succeeded', output, durationMs });
}
