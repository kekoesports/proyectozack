---
summary: 'ADR: añadir xAI como proveedor opcional de Zack Agent OS y mantener Hermes fuera del runtime del producto.'
read_when:
  - Changing model providers for Zack Agent OS
  - Considering Hermes Agent for SocialPro
  - Adding provider-side search or hosted tools
---

# ADR-0007 — xAI opcional y límite de Hermes

- **Estado:** Aceptado
- **Fecha:** 2026-09-07
- **Decisores:** SocialPro
- **Ámbito:** Zack Agent OS, proveedores de modelo y runtime externo

## Contexto

Zack Agent OS ya abstrae el modelo mediante `AgentModelProvider`, pero solo
disponía de un adaptador real de Gemini. Se evaluaron dos ampliaciones:

1. añadir xAI/Grok como segundo proveedor para cargas operativas;
2. integrar Hermes Agent como runtime interno o como ayudante externo.

Los slugs Grok 4.1 Fast quedaron retirados el 15-05-2026 y redirigen a Grok
4.3. El modelo debe elegirse de forma explícita para que capacidad y coste no
dependan de una redirección futura.

Hermes es un runtime de agente completo con memoria, herramientas, ejecución
de shell/navegador y automatizaciones propias. Embederlo duplicaría políticas,
memoria, schedules, permisos, auditoría e idempotencia que Zack Agent OS ya
controla.

## Decisión

1. Añadir un adaptador xAI sobre `POST /v1/chat/completions` usando `fetch`
   nativo y respuestas externas validadas con Zod.
2. Mantener la selección por agente en los campos existentes
   `model_provider` y `model_name`. No se necesita una migración.
3. Usar `grok-4.3` como fallback explícito cuando una definición xAI no trae
   modelo, por ser el reemplazo vigente y de menor coste de Grok 4 Fast. La
   definición persistida puede fijar otro modelo tras evaluación.
4. No mover ningún agente existente a xAI en este cambio. La integración queda
   disponible pero inactiva hasta un rollout separado con fixtures, shadow,
   presupuesto y comparación humana.
5. Declarar únicamente las tools locales allowlisted. No habilitar
   `web_search`, `x_search`, code execution ni otra tool del proveedor. Estas
   capacidades alterarían la frontera de datos, coste y auditoría y requieren
   otra decisión.
6. Indexar las tarifas por proveedor + modelo, registrar tokens de caché y
   aplicar el tramo de contexto largo cuando corresponda.
7. Conservar la clasificación transitoria del adaptador hasta la política de
   reintentos. Una respuesta o argumentos malformados fallan de forma
   permanente y cerrada.
8. No integrar Hermes dentro del producto, worker ni contenedor de Zack Agent
   OS.
9. Un posible uso futuro de Hermes será un ayudante externo y de solo lectura,
   con credencial y endpoints de lectura dedicados. `AGENT_INTERNAL_TOKEN` no
   sirve para ese fin: también autentica escrituras de heartbeats y eventos.

## Consecuencias

- Gemini continúa funcionando sin cambios de catálogo ni activación.
- xAI puede evaluarse agente por agente sin duplicar el executor ni saltarse
  RBAC, policy engine, aprobaciones o idempotencia.
- No se obtiene acceso automático a información en tiempo real de X. Habilitar
  X Search sería una ampliación explícita de alcance.
- La tabla de precios sigue siendo una estimación revisable y fechada. Un
  proveedor/modelo sin tarifa conocida queda marcado como desconocido.
- Hermes no puede convertirse accidentalmente en una segunda fuente de verdad
  de memoria, permisos o schedules.

## Fuentes verificadas

- Retirada de modelos del 15-05-2026: <https://docs.x.ai/developers/migration/may-15-retirement>
- Precios de modelos: <https://docs.x.ai/developers/pricing>
- Function calling: <https://docs.x.ai/developers/tools/function-calling>
- X Search: <https://docs.x.ai/developers/tools/x-search>
- Hermes Agent: <https://github.com/NousResearch/hermes-agent>
- Seguridad de Hermes: <https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md>
