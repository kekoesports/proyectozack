# Asistente IA — SocialPro CRM

Asistente de consulta interno integrado en el panel admin. Permite preguntar sobre facturación, campañas, marcas, talentos y finanzas usando lenguaje natural.

## ¿Qué puede hacer?

- Responder preguntas sobre el funcionamiento del CRM
- Mostrar resúmenes financieros del mes actual
- Listar facturas vencidas y pendientes de cobro
- Analizar márgenes de campañas activas
- Resumir gastos recurrentes por categoría
- Detectar situaciones que requieren atención
- Responder en lenguaje natural en español

## ¿Qué NO puede hacer? (Fase 1 — Solo lectura)

- Enviar pagos ni transferencias
- Borrar ni modificar facturas, contratos ni datos
- Marcar facturas como cobradas/pagadas automáticamente
- Enviar emails o notificaciones externas
- Conectar con bancos reales (Wise, Stripe, etc.)
- Revelar IBANs completos, tokens, claves API
- Ejecutar SQL manual ni acciones directas sobre BD
- Acciones legales o fiscales definitivas sin revisión humana

## Permisos de acceso

| Rol | Acceso |
|-----|--------|
| admin | Completo |
| manager | Completo |
| finance | Completo |
| analyst | Completo |
| ops | Completo |
| talent_manager | Completo |
| editor | Completo |
| staff | Sin acceso (no aparece en nav) |
| brand | Sin acceso (usuario de portal) |

## Ruta

`/admin/asistente`

## Tools disponibles (solo lectura)

| Tool | Descripción |
|------|-------------|
| `getBillingSummary` | Resumen financiero del mes actual (ingresos, gastos, neto, KPIs) |
| `getOverdueInvoices` | Facturas vencidas sin cobrar |
| `getPendingInvoices` | Facturas emitidas pendientes de cobro |
| `getCampaignMarginSummary` | Campañas recientes con margen estimado y real |
| `getActiveCampaigns` | Campañas activas y en negociación |
| `getRecurringExpensesSummary` | Lista de gastos recurrentes activos |
| `getMonthlyExpenseSummary` | Total mensual de gastos fijos por categoría |
| `getCrmHelpContext` | Documentación interna del CRM por módulo |

## Arquitectura

```
src/
├── db/schema/aiAssistant.ts          # Tablas: threads, messages, tool_executions
├── types/aiAssistant.ts              # Tipos derivados de Drizzle
├── lib/
│   ├── schemas/aiAssistant.ts        # Validación Zod de inputs
│   ├── queries/aiAssistant.ts        # CRUD threads y mensajes
│   └── services/ai-assistant/
│       ├── index.ts                  # Orquestador: sendMessage()
│       ├── provider.ts               # Interface AiProvider + GeminiProvider + NullProvider
│       ├── mask.ts                   # maskIban, maskEmail, maskTaxId
│       ├── guardrails.ts             # Patrones bloqueados + instrucciones sistema
│       ├── context.ts                # System prompt por contextType
│       └── tools/
│           ├── index.ts              # Registro + ejecutor de tools
│           ├── billing.ts            # getBillingSummary, getOverdueInvoices, getPendingInvoices
│           ├── campaigns.ts          # getCampaignMarginSummary, getActiveCampaigns
│           ├── expenses.ts           # getRecurringExpensesSummary, getMonthlyExpenseSummary
│           └── help.ts               # getCrmHelpContext (docs internas)
├── app/
│   ├── api/admin/ai-assistant/
│   │   ├── route.ts                  # POST (enviar), GET (listar threads), DELETE (borrar)
│   │   └── [threadId]/route.ts       # GET (cargar hilo con mensajes)
│   └── admin/(dashboard)/asistente/
│       └── page.tsx                  # Página del asistente
└── features/admin/ai-assistant/
    └── components/
        └── ChatClient.tsx            # Interfaz de chat (client component)
```

## Tablas de BD

### `ai_assistant_threads`
Hilos de conversación por usuario.
- `id`, `title`, `userId`, `contextType` (general/facturacion/campanas/talentos/marcas/finanzas)
- `createdAt`, `updatedAt`

### `ai_assistant_messages`
Mensajes individuales de cada hilo.
- `id`, `threadId`, `role` (user/assistant/system), `content`, `metadata` (jsonb), `createdAt`

### `ai_tool_executions`
Log de ejecuciones de tools (auditoría).
- `id`, `threadId`, `messageId`, `toolName`, `inputJson`, `outputJson`
- `status` (success/error/blocked), `errorMessage`, `createdAt`

## Variables de entorno necesarias

```env
GEMINI_API_KEY=...      # Google Gemini API key (optional — degrada si falta)
GEMINI_MODEL=gemini-2.0-flash  # Modelo a usar (default: gemini-2.0-flash)
```

Si `GEMINI_API_KEY` no está configurada, el asistente muestra un mensaje informativo sin errores.

## Cómo probarlo en local

1. Asegúrate de tener `GEMINI_API_KEY` en `.env.local` (obtener en Google AI Studio)
2. `npm run dev`
3. Navegar a `/admin/asistente`
4. Preguntas de prueba:
   - "¿Qué facturas están vencidas?"
   - "Dame un resumen financiero del mes"
   - "¿Cómo funciona el módulo de facturación?"
   - Intentar acción bloqueada: "Borra la factura 1" → debe bloquear

## Cómo añadir nuevas tools

1. Crear función de lectura en `src/lib/services/ai-assistant/tools/<dominio>.ts`
   - Solo operaciones de lectura (`db.select()`)
   - Devolver datos mínimos necesarios
   - Enmascarar datos sensibles con funciones de `mask.ts`
2. Registrar en `src/lib/services/ai-assistant/tools/index.ts`:
   - Añadir al tipo `ToolName`
   - Añadir al array `AVAILABLE_TOOLS`
   - Añadir `case` en la función `executeTool`
   - Añadir descripción en `TOOLS_DESCRIPTION`
3. Documentar en este archivo

## Guardrails — lista de patrones bloqueados

El asistente detecta y bloquea automáticamente mensajes que contengan:
- Solicitudes de pago o transferencia
- Borrado o eliminación de datos
- Modificación de importes
- Cambio de estado de facturas
- Datos fiscales
- Secretos, tokens, IBANs completos
- SQL directo
- Envío de emails o facturas automáticos
- Conexión con bancos reales (Stripe, Wise)

Ante cualquiera, responde: _"Esta acción requiere aprobación humana."_

## Próximos pasos recomendados

- **Fase 2**: Sistema de sugerencias — guardar alertas detectadas por la IA en una tabla `ai_finance_suggestions` para revisión humana
- **Fase 3**: Contexto dinámico — que la página de facturas pase `contextType='facturacion'` automáticamente
- **Fase 4**: Análisis histórico — comparativas por periodos, tendencias, predicciones
- **Fase 5**: Automatizaciones aprobadas — ejecutar acciones con confirmación explícita del usuario
