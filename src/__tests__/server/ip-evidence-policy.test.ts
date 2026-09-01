import {
  calculateProjectReadiness,
  provisionalAssessmentForCategory,
  recordModeForWorkDate,
} from '@/lib/ip-evidence/policy';

describe('política conservadora del expediente IP', () => {
  it('separa candidatos de mantenimiento y operaciones', () => {
    expect(provisionalAssessmentForCategory('experimental_development')).toBe('rd_candidate');
    expect(provisionalAssessmentForCategory('product_development')).toBe('it_candidate');
    expect(provisionalAssessmentForCategory('testing')).toBe('it_candidate');
    expect(provisionalAssessmentForCategory('maintenance')).toBe('non_qualifying');
    expect(provisionalAssessmentForCategory('operations')).toBe('non_qualifying');
    expect(provisionalAssessmentForCategory('security')).toBe('unassessed');
  });

  it('marca como reconstruido lo registrado con retraso', () => {
    const recordedAt = new Date('2026-09-01T18:00:00.000Z');
    expect(recordModeForWorkDate('2026-09-01', recordedAt)).toBe('contemporaneous');
    expect(recordModeForWorkDate('2026-08-31', recordedAt)).toBe('contemporaneous');
    expect(recordModeForWorkDate('2026-08-30', recordedAt)).toBe('reconstructed');
  });

  it('la preparación completa exige trazabilidad y coherencia de entidades', () => {
    expect(calculateProjectReadiness({
      hasExpectedOutcome: true,
      hasTechnicalUncertainty: true,
      logCount: 10,
      evidenceCount: 10,
      candidateMinutes: 600,
      contemporaneousCount: 9,
      ownerEqualsPayer: true,
    })).toEqual({ score: 100, gaps: [] });

    const incomplete = calculateProjectReadiness({
      hasExpectedOutcome: false,
      hasTechnicalUncertainty: false,
      logCount: 0,
      evidenceCount: 0,
      candidateMinutes: 0,
      contemporaneousCount: 0,
      ownerEqualsPayer: false,
    });
    expect(incomplete.score).toBe(0);
    expect(incomplete.gaps).toContain('Registrar horas de trabajo');
    expect(incomplete.gaps).toContain('Documentar la relación entre titular y entidad que soporta el coste');
  });
});

