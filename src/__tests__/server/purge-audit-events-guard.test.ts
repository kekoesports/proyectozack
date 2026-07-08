/**
 * Sorteos Fase 1 PR2 — script purge-audit-events.
 *
 * Verifica el contrato del guard:
 *   - Dry-run por defecto.
 *   - Guard exacto: CONFIRM_PURGE_AUDIT_EVENTS=I_ACCEPT_PURGE_AUDIT_EVENTS.
 *   - Retención por defecto: 730 días. Rango [30, 3650].
 */

import {
  PURGE_GUARD_ENV,
  PURGE_GUARD_VALUE,
  PURGE_DEFAULT_DAYS,
  PURGE_MIN_DAYS,
  PURGE_MAX_DAYS,
  parseArgs,
  isPurgeConfirmed,
} from '../../../scripts/purge-audit-events';

// Cast local para el mock de env en tests — evitamos NodeJS.ProcessEnv rígido.
const env = (obj: Record<string, string>): NodeJS.ProcessEnv => obj as NodeJS.ProcessEnv;

describe('purge-audit-events — guard constants', () => {
  it('PURGE_GUARD_ENV es CONFIRM_PURGE_AUDIT_EVENTS', () => {
    expect(PURGE_GUARD_ENV).toBe('CONFIRM_PURGE_AUDIT_EVENTS');
  });

  it('PURGE_GUARD_VALUE es I_ACCEPT_PURGE_AUDIT_EVENTS (exacto)', () => {
    expect(PURGE_GUARD_VALUE).toBe('I_ACCEPT_PURGE_AUDIT_EVENTS');
  });

  it('PURGE_DEFAULT_DAYS es 730 (~2 años)', () => {
    expect(PURGE_DEFAULT_DAYS).toBe(730);
  });

  it('rango de días permitido: [30, 3650]', () => {
    expect(PURGE_MIN_DAYS).toBe(30);
    expect(PURGE_MAX_DAYS).toBe(3650);
  });
});

describe('parseArgs — retención', () => {
  it('sin argumentos → 730 días', () => {
    expect(parseArgs([])).toEqual({ olderThanDays: 730 });
  });

  it('--older-than-days=365', () => {
    expect(parseArgs(['--older-than-days=365'])).toEqual({ olderThanDays: 365 });
  });

  it('--older-than-days=30 (mínimo)', () => {
    expect(parseArgs(['--older-than-days=30'])).toEqual({ olderThanDays: 30 });
  });

  it('--older-than-days=3650 (máximo)', () => {
    expect(parseArgs(['--older-than-days=3650'])).toEqual({ olderThanDays: 3650 });
  });

  it('rechaza <30 días', () => {
    expect(() => parseArgs(['--older-than-days=29'])).toThrow();
    expect(() => parseArgs(['--older-than-days=0'])).toThrow();
    expect(() => parseArgs(['--older-than-days=-100'])).toThrow();
  });

  it('rechaza >3650 días', () => {
    expect(() => parseArgs(['--older-than-days=3651'])).toThrow();
    expect(() => parseArgs(['--older-than-days=999999'])).toThrow();
  });

  it('rechaza valores no numéricos', () => {
    expect(() => parseArgs(['--older-than-days=abc'])).toThrow();
    expect(() => parseArgs(['--older-than-days='])).toThrow();
  });

  it('ignora argumentos desconocidos', () => {
    expect(parseArgs(['--random-arg=1'])).toEqual({ olderThanDays: 730 });
  });
});

describe('isPurgeConfirmed — guard estricto', () => {
  it('sin variable → false', () => {
    expect(isPurgeConfirmed(env({}))).toBe(false);
  });

  it('con valor exacto → true', () => {
    expect(isPurgeConfirmed(env({ CONFIRM_PURGE_AUDIT_EVENTS: 'I_ACCEPT_PURGE_AUDIT_EVENTS' }))).toBe(true);
  });

  it('con "true" → false (intencional — bloquea accidentes)', () => {
    expect(isPurgeConfirmed(env({ CONFIRM_PURGE_AUDIT_EVENTS: 'true' }))).toBe(false);
  });

  it('con "1" → false', () => {
    expect(isPurgeConfirmed(env({ CONFIRM_PURGE_AUDIT_EVENTS: '1' }))).toBe(false);
  });

  it('con "yes" → false', () => {
    expect(isPurgeConfirmed(env({ CONFIRM_PURGE_AUDIT_EVENTS: 'yes' }))).toBe(false);
  });

  it('con valor con espacios → false (no trim)', () => {
    expect(isPurgeConfirmed(env({ CONFIRM_PURGE_AUDIT_EVENTS: ' I_ACCEPT_PURGE_AUDIT_EVENTS ' }))).toBe(false);
  });

  it('con valor case-different → false', () => {
    expect(isPurgeConfirmed(env({ CONFIRM_PURGE_AUDIT_EVENTS: 'i_accept_purge_audit_events' }))).toBe(false);
  });
});
