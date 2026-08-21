/**
 * Catálogo de agentes y seed.
 *
 * El seed corre en cada despliegue, así que lo que aquí se protege es que
 * repetirlo sea inocuo: seis agentes, todos apagados y en shadow, con límites
 * que la base acepta y sin un secreto colado en la configuración.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import fs from 'fs';
import path from 'path';

import {
  AGENT_CATALOG,
  AGENT_SLUGS,
  SEED_AGENT_MODE,
  SEED_AGENT_STATUS,
} from '@/lib/agents/catalog';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SEED = fs.readFileSync(path.join(ROOT, 'scripts/seed-agent-definitions.ts'), 'utf-8');

describe('catálogo de agentes', () => {
  it('define los seis agentes del blueprint', () => {
    expect([...AGENT_SLUGS].sort()).toEqual(
      ['crm-steward', 'deal-clerk', 'dev', 'growth', 'guardian', 'seo'].sort(),
    );
  });

  it('los slugs no se repiten', () => {
    expect(new Set(AGENT_SLUGS).size).toBe(AGENT_CATALOG.length);
  });

  it('nace todo apagado y en shadow', () => {
    expect(SEED_AGENT_STATUS).toBe('disabled');
    expect(SEED_AGENT_MODE).toBe('shadow');
  });

  it('ningún agente sale a un proveedor de modelo real todavía', () => {
    for (const agente of AGENT_CATALOG) {
      expect(agente.modelProvider).toBe('null');
      expect(agente.modelName).toBeNull();
    }
  });

  it('los límites cumplen los CHECK de la tabla', () => {
    for (const agente of AGENT_CATALOG) {
      expect(agente.maxConcurrentRuns).toBeGreaterThan(0);
      expect(agente.maxRunsPerDay).toBeGreaterThan(0);
      expect(agente.maxTurnsPerRun).toBeGreaterThan(0);
      expect(agente.maxToolCallsPerRun).toBeGreaterThan(0);
      expect(agente.maxDurationSeconds).toBeGreaterThan(0);
      expect(agente.monthlyBudgetMicros).toBeGreaterThanOrEqual(0);
    }
  });

  it('cada agente lleva descripción y nombre visible', () => {
    for (const agente of AGENT_CATALOG) {
      expect(agente.displayName.length).toBeGreaterThan(0);
      expect(agente.description.length).toBeGreaterThan(20);
    }
  });

  it('el catálogo no transporta secretos', () => {
    // settingsJson se escribe vacío en el seed; aquí se vigila que nadie meta
    // una clave por la puerta de atrás del catálogo.
    const serializado = JSON.stringify(AGENT_CATALOG).toLowerCase();
    for (const prohibido of ['api_key', 'apikey', 'token', 'secret', 'password']) {
      expect(serializado).not.toContain(prohibido);
    }
  });
});

describe('scripts/seed-agent-definitions.ts', () => {
  it('es idempotente: resuelve el conflicto en vez de duplicar', () => {
    expect(SEED).toMatch(/onConflictDoUpdate/);
    expect(SEED).toMatch(/target: schema\.agentDefinitions\.slug/);
  });

  it('no pisa status ni mode al actualizar', () => {
    // Volver a sembrar no puede apagar un agente que un humano activó, ni
    // reactivar uno que alguien paró en caliente.
    const bloqueSet = SEED.slice(SEED.indexOf('onConflictDoUpdate'));
    const set = bloqueSet.slice(bloqueSet.indexOf('set: {'), bloqueSet.indexOf('});'));
    expect(set).not.toMatch(/\bstatus:/);
    expect(set).not.toMatch(/\bmode:/);
  });

  it('inserta siempre en disabled y shadow', () => {
    expect(SEED).toMatch(/status: SEED_AGENT_STATUS/);
    expect(SEED).toMatch(/mode: SEED_AGENT_MODE/);
  });

  it('no crea rutinas ni activa nada', () => {
    expect(SEED).not.toMatch(/agentSchedules/);
    expect(SEED).not.toMatch(/enabled:\s*true/);
  });

  it('no escribe settings con contenido', () => {
    expect(SEED).toMatch(/settingsJson: \{\}/);
  });
});
