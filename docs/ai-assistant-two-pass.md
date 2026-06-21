# AI Assistant — Auditoría del flujo two-pass

## Flujo completo

```
Usuario envía mensaje
        │
        ▼
[1] checkGuardrails(userMessage)
        │ bloqueado? → guardar par en BD + retornar mensaje de bloqueo
        │ OK ↓
[2] Strip de tokens TOOL del mensaje
        │  safeUserMessage = userMessage.replace(/\[TOOL:[^\]]*\]/g, '[solicitud bloqueada]')
        │  (el original ya está guardado en BD — el strip es solo para el proveedor IA)
        │
        ▼
[3] Primera llamada al proveedor IA
        │  provider.chat(systemPrompt, providerHistory, safeUserMessage)
        │
        ▼
[4] ¿Respuesta contiene [TOOL:X]?
        │  NO → finalText = firstAiResponse.text  (pasa 2 omitida)
        │  SÍ ↓
[5] gatherToolResults(firstResponseText, threadId)
     ├─ Para cada [TOOL:X] en la respuesta:
     │   ├─ ¿X ∈ AVAILABLE_TOOLS? NO → logToolExecution(status:'blocked') + continue
     │   ├─ Parsear input JSON opcional
     │   ├─ runTool({ name, threadId, input })   → logToolExecution(status:'success'|'error')
     │   └─ sanitizeToolOutput(result.data) → JSON
        │
        ▼
[6] Segunda llamada al proveedor IA
        │  Historia: [...providerHistory, { user: safeUserMessage }, { model: firstResponse }]
        │  Mensaje: "He consultado las herramientas. Datos:\n\n=== tool ===\n{json}\n\nResponde..."
        │
        ▼
[7] finalText = secondAiResponse.text
        │  (si secondAiResponse contiene [TOOL:X] → queda como texto literal, NO se reprocesa)
        │
        ▼
[8] insertMessage(threadId, 'assistant', finalText)
[9] touchThread + updateThreadTitle (en primer mensaje)
```

## Cuándo se omite la segunda pasada

- El proveedor devuelve `usedAi: false` (NullProvider — API key no configurada)
- La respuesta de la primera pasada no contiene ningún patrón `[TOOL:X]`
- Todos los tool calls encontrados están fuera del allowlist (bloqueados)

## Allowlist de herramientas (solo lectura)

```
getBillingSummary        getOverdueInvoices       getPendingInvoices
getCampaignMarginSummary getActiveCampaigns       getRecurringExpensesSummary
getMonthlyExpenseSummary getCrmHelpContext
```

Todas las herramientas son `get*`. No existen herramientas de escritura, borrado ni envío.

## Logging

| Evento | Tabla | status |
|---|---|---|
| Tool ejecutada con éxito | `ai_tool_executions` | `success` |
| Tool que lanzó excepción | `ai_tool_executions` | `error` |
| Tool fuera del allowlist | `ai_tool_executions` | `blocked` |
| Guardrail activado | mensaje guardado con `{ blocked: true }` en metadata | — |

El logging es best-effort: si falla, no interrumpe el flujo.

## Sanitización de outputs

`sanitizeToolOutput(value)` se aplica a `result.data` antes de `JSON.stringify` en la segunda pasada.

Acciones recursivas:
- **Strings**: trunca a 400 chars, enmascara IBANs / emails / NIFs/CIFs
- **Arrays**: limita a 25 filas
- **Objetos**: redacta valores cuya clave contenga `password`, `secret`, `token`, `apikey`, `iban`, `taxid`, `fiscal`, `credential`, `privatekey`
- **Números / booleanos**: pasan sin cambio

## Protección contra inyección de tokens TOOL

Defensa en profundidad (dos capas):

1. **Strip en el orquestador** (`sendMessage`): `[TOOL:X]` en el mensaje del usuario se reemplaza por `[solicitud bloqueada]` antes de enviarse al proveedor. El mensaje original ya está guardado en BD y no se altera.

2. **Allowlist en `gatherToolResults`**: solo tools del array `AVAILABLE_TOOLS` se ejecutan; las desconocidas se loggean como `blocked` y se omiten.

## Manejo de errores

- Si `runTool` lanza, la tool retorna `{ ok: false, error: msg }` y el contenido en la segunda pasada es `Error: <mensaje>`.
- Si la segunda llamada al proveedor IA falla, la excepción burbujea hasta `sendMessage` y el error se devuelve al cliente (sin guardar mensaje de asistente).
- Si `logToolExecution` falla, se loggea con `logRedacted('warn', ...)` y el flujo continúa.

## Límites actuales

- El sistema no detecta bucles de tools (e.g., segunda respuesta con más `[TOOL:X]`). Si ocurre, los tokens quedan como texto literal (sin ejecutarse), lo que es el comportamiento seguro por defecto.
- Máximo 25 registros por array en la sanitización — suficiente para los casos de uso actuales.
- Máximo 20 mensajes de historial pasados al proveedor (`history.slice(-20)`).
- Solo se ejecutan tools emitidas en la **primera** pasada; la segunda pasada no detecta ni ejecuta tools.
