/**
 * Contrato de las señales entrantes.
 *
 * Lo que llega aquí acaba, filtrado por reglas deterministas, en el contexto de
 * un modelo. La validación no es cortesía: es lo que impide que el ingestor sea
 * una vía de entrada a ese contexto.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import fs from 'fs';
import path from 'path';

import {
  AGENT_EVENT_TYPES,
  AgentEventIngestSchema,
  AgentHeartbeatSchema,
  MAX_PAYLOAD_BYTES,
} from '@/lib/schemas/agentEvent';

const VALIDO = {
  source: 'collector',
  eventType: 'system.disk',
  severity: 'critical',
  payload: { usedPct: 91, mount: '/' },
};

describe('eventos entrantes', () => {
  it('acepta una señal bien formada', () => {
    const r = AgentEventIngestSchema.safeParse(VALIDO);
    expect(r.success).toBe(true);
  });

  it('rechaza un tipo que no está en la allowlist', () => {
    // No basta con validar la forma: un tipo desconocido se rechaza en vez de
    // guardarse "por si acaso". Añadir uno obliga a pensar qué regla lo procesa.
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, eventType: 'system.inventado' }).success).toBe(
      false,
    );
  });

  it('rechaza un origen desconocido', () => {
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, source: 'internet' }).success).toBe(false);
  });

  it('rechaza una severidad inventada', () => {
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, severity: 'apocalipsis' }).success).toBe(false);
  });

  it('la severidad por defecto es la más baja', () => {
    const r = AgentEventIngestSchema.safeParse({ source: 'collector', eventType: 'system.disk' });
    expect(r.success && r.data.severity).toBe('info');
  });

  it('rechaza un payload demasiado grande', () => {
    const gigante = { texto: 'x'.repeat(MAX_PAYLOAD_BYTES + 500) };
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, payload: gigante }).success).toBe(false);
  });

  it('rechaza cadenas largas dentro del payload', () => {
    // Un `message` de 10 KB acabaría en un prompt. El collector envía métricas,
    // no prosa.
    expect(
      AgentEventIngestSchema.safeParse({ ...VALIDO, payload: { nota: 'x'.repeat(500) } }).success,
    ).toBe(false);
  });

  it('rechaza anidamiento profundo', () => {
    // Un JSON anidado hasta el infinito es una forma barata de tumbar un parser.
    const profundo = { a: { b: { c: { d: 'demasiado' } } } };
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, payload: profundo }).success).toBe(false);
  });

  it('admite un nivel de anidamiento, que es lo que usa el collector', () => {
    expect(
      AgentEventIngestSchema.safeParse({ ...VALIDO, payload: { disk: { usedPct: 91 } } }).success,
    ).toBe(true);
  });

  it('acota externalId y fingerprint', () => {
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, externalId: 'x'.repeat(300) }).success).toBe(
      false,
    );
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, fingerprint: 'x'.repeat(200) }).success).toBe(
      false,
    );
  });

  it('exige que occurredAt sea una fecha ISO', () => {
    expect(AgentEventIngestSchema.safeParse({ ...VALIDO, occurredAt: 'ayer' }).success).toBe(false);
    expect(
      AgentEventIngestSchema.safeParse({ ...VALIDO, occurredAt: '2026-08-21T10:00:00.000Z' }).success,
    ).toBe(true);
  });

  it('la allowlist es corta a propósito', () => {
    // Cada entrada existe porque hay una regla que sabe qué hacer con ella.
    expect(AGENT_EVENT_TYPES.length).toBeLessThan(30);
  });
});

describe('latidos', () => {
  it('acepta uno bien formado', () => {
    expect(AgentHeartbeatSchema.safeParse({ workerId: 'w1' }).success).toBe(true);
  });

  it('exige identificador de worker', () => {
    expect(AgentHeartbeatSchema.safeParse({ workerId: '' }).success).toBe(false);
    expect(AgentHeartbeatSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un estado que la tabla no admite', () => {
    // `agent_worker_heartbeats_status_ck` solo acepta cuatro valores.
    expect(AgentHeartbeatSchema.safeParse({ workerId: 'w1', status: 'zombi' }).success).toBe(false);
  });

  it('acepta que no haya ejecución en curso', () => {
    const r = AgentHeartbeatSchema.safeParse({ workerId: 'w1', currentRunId: null });
    expect(r.success && r.data.currentRunId).toBeNull();
  });
});

describe('el collector no manda lo que no debe', () => {
  const script = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'infra/agents/collector/collect-system-health.sh'),
    'utf-8',
  );
  // Los comentarios explican justo lo que NO se envía, así que analizarlos como
  // si fueran código daría falsos positivos.
  const codigo = script
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');

  it('no vuelca logs ni journal', () => {
    expect(codigo).not.toMatch(/journalctl/);
    expect(codigo).not.toMatch(/\btail\s+-\w*\s*\/var\/log/);
  });

  it('no vuelca variables de entorno ni configuración', () => {
    expect(codigo).not.toMatch(/\bprintenv\b/);
    expect(codigo).not.toMatch(/\benv\b\s*\|/);
    expect(codigo).not.toMatch(/docker\s+inspect/);
  });

  it('no lista procesos', () => {
    expect(codigo).not.toMatch(/\bps\s+aux\b/);
  });

  it('no usa curl --verbose, que volcaría el token en el journal', () => {
    expect(codigo).not.toMatch(/curl[^\n]*(-v\b|--verbose)/);
  });

  it('firma con HMAC y marca de tiempo', () => {
    expect(codigo).toMatch(/x-agent-signature/);
    expect(codigo).toMatch(/x-agent-timestamp/);
    expect(codigo).toMatch(/openssl dgst -sha256 -hmac/);
  });

  it('la lista de servicios es cerrada, no un listado del sistema', () => {
    // Un bucle sobre `systemctl list-units` mandaría el nombre de todo lo que
    // corre en la máquina.
    expect(codigo).not.toMatch(/systemctl\s+list-units/);
    expect(codigo).toMatch(/GUARDIAN_SERVICES/);
  });

  it('para ante el primer error en vez de seguir a ciegas', () => {
    expect(codigo).toMatch(/set -euo pipefail/);
  });
});

describe('la unidad systemd está acotada', () => {
  const unidad = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'infra/agents/collector/socialpro-guardian-collector.service'),
    'utf-8',
  );

  it('no corre como root', () => {
    expect(unidad).toMatch(/User=guardian-collector/);
    expect(unidad).not.toMatch(/User=root/);
  });

  it('no puede escalar privilegios', () => {
    expect(unidad).toMatch(/NoNewPrivileges=true/);
  });

  it('ve el sistema en solo lectura y sin /home', () => {
    expect(unidad).toMatch(/ProtectSystem=strict/);
    expect(unidad).toMatch(/ProtectHome=true/);
  });

  it('los backups se leen, no se tocan', () => {
    expect(unidad).toMatch(/ReadOnlyPaths=-\/var\/backups/);
  });
});
