import { z } from 'zod';

/**
 * Contrato de las señales que entran por `/api/internal/agents/events`.
 *
 * Todo lo que llega aquí es dato hostil: un collector puede estar mal
 * configurado, un webhook puede repetirse mil veces, y el payload puede traer
 * cualquier cosa. La validación no es cortesía — es lo que impide que un
 * ingestor sea una vía de entrada al contexto de un modelo.
 *
 * Tres decisiones:
 *
 * 1. **`eventType` va en allowlist.** No basta con validar la forma: un tipo
 *    desconocido se rechaza en vez de guardarse "por si acaso". Añadir uno es
 *    un PR, y eso obliga a pensar qué regla lo va a procesar.
 * 2. **El payload tiene tope y profundidad limitada.** Un JSON anidado hasta el
 *    infinito es una forma barata de tumbar un parser.
 * 3. **Nada de campos libres largos.** Un `message` de 10 KB acabaría en un
 *    prompt; el collector envía métricas, no prosa.
 */

/**
 * Tipos aceptados.
 *
 * Corta a propósito. Cada entrada existe porque hay —o habrá en PR 6— una regla
 * determinista que sabe qué hacer con ella.
 */
export const AGENT_EVENT_TYPES = [
  // Infraestructura, del collector del VPS.
  'system.disk',
  'system.memory',
  'system.load',
  'system.inodes',
  'system.service',
  // Salud de la aplicación y sus dependencias.
  'app.health',
  'app.deploy',
  'db.health',
  'storage.health',
  'backup.heartbeat',
  'backup.failed',
  // Integraciones.
  'n8n.workflow_failed',
  'n8n.health',
  'github.workflow_failed',
  'uptime.down',
  'uptime.up',
  'tls.expiring',
] as const;

export type AgentEventType = (typeof AGENT_EVENT_TYPES)[number];

export const AGENT_EVENT_SOURCES = [
  'collector',
  'uptime',
  'n8n',
  'github',
  'app',
  'backup',
] as const;

/** Tope del payload serializado. */
export const MAX_PAYLOAD_BYTES = 8_000;

/**
 * Valor de payload admisible.
 *
 * Números, cadenas cortas y booleanos, con un nivel de anidamiento. Suficiente
 * para `{ disk: { usedPct: 91, mount: "/" } }` y no para un volcado de logs.
 */
const valorPlano = z.union([z.string().max(200), z.number(), z.boolean(), z.null()]);

const payloadSchema = z
  .record(z.string().max(60), z.union([valorPlano, z.record(z.string().max(60), valorPlano)]))
  .refine((p) => JSON.stringify(p).length <= MAX_PAYLOAD_BYTES, {
    message: `El payload supera ${MAX_PAYLOAD_BYTES} bytes`,
  });

export const AgentEventIngestSchema = z.object({
  source: z.enum(AGENT_EVENT_SOURCES),
  eventType: z.enum(AGENT_EVENT_TYPES),
  /**
   * Identificador del sistema de origen. Con él, dos envíos de la misma alerta
   * son el mismo evento; sin él, se deduplica por el contenido.
   */
  externalId: z.string().max(240).optional(),
  severity: z.enum(['info', 'warning', 'high', 'critical']).default('info'),
  /** Agrupa repeticiones del mismo síntoma. */
  fingerprint: z.string().max(160).optional(),
  /** Cuándo ocurrió de verdad, que no es cuándo llegó. */
  occurredAt: z.string().datetime().optional(),
  payload: payloadSchema.default({}),
});

export type AgentEventIngest = z.infer<typeof AgentEventIngestSchema>;

/**
 * Heartbeat de un worker o collector.
 *
 * `hostname` se acota y no se valida como FQDN a propósito: en un contenedor es
 * un hash corto, y exigir un formato de dominio solo produciría rechazos.
 */
export const AgentHeartbeatSchema = z.object({
  workerId: z.string().min(1).max(120),
  version: z.string().max(80).default('unknown'),
  hostname: z.string().max(160).default('unknown'),
  status: z.enum(['starting', 'healthy', 'draining', 'stopped']).default('healthy'),
  currentRunId: z.number().int().positive().nullable().default(null),
  /** Métricas operativas. Sin secretos: el redactor las repasa igualmente. */
  metadata: z.record(z.string().max(60), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
});

export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;
