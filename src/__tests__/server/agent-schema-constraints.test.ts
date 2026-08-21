/**
 * Contrato de la migración 0124 — fundación de Zack Agent OS.
 *
 * En CI no hay Postgres (jest.setup.ts apunta DATABASE_URL a un host de
 * mentira), así que estas garantías no se comprueban ejecutando la migración
 * sino leyéndola. Lo que se verifica es exactamente lo que un `DROP` colado
 * rompería: que la migración solo crea, que no toca ninguna tabla existente y
 * que los índices y CHECKs que sostienen idempotencia, aprobaciones y scope de
 * memoria están escritos en el SQL y no solo en TypeScript.
 *
 * Ver docs/agent-os/pr1-runtime-schema.md §Pruebas.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MIGRATION = path.join(ROOT, 'drizzle/0124_agent_runtime_schema.sql');
const JOURNAL = path.join(ROOT, 'drizzle/meta/_journal.json');

const sql = fs.readFileSync(MIGRATION, 'utf-8');

/**
 * Solo lo que Postgres ejecuta. La cabecera documental del fichero menciona
 * "cero DROP" en prosa, y buscar la palabra a secas la contaría como un DROP
 * real: un test que falla por su propio comentario no vigila nada.
 */
const sqlEjecutable = sql
  .split('\n')
  .filter((linea) => !linea.trimStart().startsWith('--'))
  .join('\n');

/** `ON DELETE cascade` es parte de una FK, no un borrado de filas. */
const sinOnDelete = sqlEjecutable.replace(/ON DELETE/gi, 'ON_FK_ACTION');

const TABLAS = [
  'agent_definitions',
  'agent_runs',
  'agent_run_steps',
  'agent_tool_calls',
  'agent_approvals',
  'agent_schedules',
  'agent_events',
  'agent_memories',
  'agent_usage_ledger',
  'agent_worker_heartbeats',
];

describe('migración 0124 — aditiva y no destructiva', () => {
  it('el archivo SQL existe y está en el journal', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
    const journal = JSON.parse(fs.readFileSync(JOURNAL, 'utf-8')) as {
      entries: Array<{ idx: number; when: number; tag: string }>;
    };
    const entry = journal.entries.find((e) => e.tag === '0124_agent_runtime_schema');
    expect(entry).toBeDefined();
    expect(entry?.idx).toBe(124);
  });

  it('no contiene DROP, RENAME, TRUNCATE ni DELETE', () => {
    expect(sinOnDelete).not.toMatch(/\bDROP\b/i);
    expect(sinOnDelete).not.toMatch(/\bRENAME\b/i);
    expect(sinOnDelete).not.toMatch(/\bTRUNCATE\b/i);
    expect(sinOnDelete).not.toMatch(/\bDELETE\b/i);
  });

  it('no altera ninguna tabla que no sea del runtime de agentes', () => {
    const alteradas = [...sqlEjecutable.matchAll(/ALTER TABLE "([a-z_]+)"/gi)].map((m) => m[1]);
    for (const tabla of alteradas) {
      expect(tabla).toMatch(/^agent_/);
    }
  });

  it('no toca las tablas del asistente actual', () => {
    // /admin/asistente debe seguir funcionando exactamente igual tras aplicarla.
    for (const tabla of ['ai_assistant_threads', 'ai_assistant_messages', 'ai_tool_executions']) {
      expect(sqlEjecutable).not.toMatch(new RegExp(`(CREATE|ALTER|DROP) TABLE "${tabla}"`, 'i'));
    }
  });

  it('crea las diez tablas del runtime', () => {
    for (const tabla of TABLAS) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE "${tabla}"`));
    }
  });
});

describe('migración 0124 — idempotencia y unicidad', () => {
  it('la clave de idempotencia de runs es única solo cuando existe', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "agent_runs_idempotency_key_uq"[^;]*WHERE idempotency_key IS NOT NULL/,
    );
  });

  it('la clave de idempotencia de tool calls también', () => {
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "agent_tool_calls_idempotency_key_uq"[^;]*WHERE idempotency_key IS NOT NULL/,
    );
  });

  it('event_key es único: el dedupe de eventos lo impone la base', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "agent_events_event_key_uq"/);
  });

  it('no hay dos pasos con la misma posición dentro de una ejecución', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "agent_run_steps_run_sequence_uq"/);
  });

  it('el slug del agente y el de la rutina son únicos', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "agent_definitions_slug_uq"/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "agent_schedules_slug_uq"/);
  });
});

describe('migración 0124 — aprobaciones', () => {
  it('solo admite una aprobación por tool call', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "agent_approvals_tool_call_uq"/);
  });

  it('impide dos pendientes con el mismo hash de acción', () => {
    // Índice PARCIAL: dos rechazos con el mismo hash sí son legítimos.
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX "agent_approvals_pending_hash_uq"[^;]*WHERE status = 'pending'/,
    );
  });

  it('exige caducidad posterior a la solicitud', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_approvals_expiry_ck"/);
  });

  it('no admite aprobar una acción forbidden', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_approvals_not_forbidden_ck"/);
  });

  it('una decisión sin decisor no es válida', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_approvals_decided_ck"/);
  });
});

describe('migración 0124 — invariantes de la cola', () => {
  it('un run terminal exige completed_at', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_runs_terminal_completed_ck"/);
  });

  it('un run en ejecución exige lease', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_runs_running_lease_ck"/);
  });

  it('esperar aprobación no retiene lease', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_runs_waiting_no_lease_ck"/);
  });

  it('los intentos no superan el máximo y los contadores no son negativos', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_runs_attempt_ck"/);
    expect(sql).toMatch(/CONSTRAINT "agent_runs_counters_ck"/);
  });

  it('el índice de cola es parcial sobre los estados reclamables', () => {
    expect(sql).toMatch(
      /CREATE INDEX "agent_runs_claimable_idx"[^;]*WHERE status IN \('queued', 'retry_scheduled'\)/,
    );
  });
});

describe('migración 0124 — memoria y rutinas', () => {
  it('el scope user exige usuario y el scope agent exige agente', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_memories_user_scope_ck"/);
    expect(sql).toMatch(/CONSTRAINT "agent_memories_agent_scope_ck"/);
  });

  it('verificado exige verificador', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_memories_verified_by_ck"/);
  });

  it('una rutina activa exige próxima ventana', () => {
    expect(sql).toMatch(/CONSTRAINT "agent_schedules_enabled_next_ck"/);
  });

  it('las rutinas nacen desactivadas', () => {
    expect(sql).toMatch(/"enabled" boolean DEFAULT false NOT NULL/);
  });
});

describe('migración 0124 — defaults seguros', () => {
  it('los agentes nacen disabled y en shadow', () => {
    expect(sql).toMatch(/"status" "agent_status" DEFAULT 'disabled' NOT NULL/);
    expect(sql).toMatch(/"mode" "agent_mode" DEFAULT 'shadow' NOT NULL/);
  });

  it('no siembra filas: la migración crea estructura, no estado', () => {
    expect(sqlEjecutable).not.toMatch(/\bINSERT INTO\b/i);
  });
});
