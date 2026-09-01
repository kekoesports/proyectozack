export const IP_ACTIVITY_CATEGORIES = [
  'research',
  'experimental_development',
  'product_development',
  'testing',
  'maintenance',
  'operations',
  'security',
  'sales_marketing',
  'administration',
  'training',
] as const;

export type IpActivityCategory = (typeof IP_ACTIVITY_CATEGORIES)[number];

export type IpProvisionalAssessment =
  | 'unassessed'
  | 'rd_candidate'
  | 'it_candidate'
  | 'non_qualifying';

export type IpRecordMode = 'contemporaneous' | 'reconstructed';

/**
 * Clasificación prudente para ordenar la evidencia. No declara elegibilidad
 * fiscal: esa conclusión exige revisión profesional y, cuando proceda, soporte
 * técnico o informe motivado.
 */
export function provisionalAssessmentForCategory(
  category: IpActivityCategory,
): IpProvisionalAssessment {
  switch (category) {
    case 'research':
    case 'experimental_development':
      return 'rd_candidate';
    case 'product_development':
    case 'testing':
      return 'it_candidate';
    case 'maintenance':
    case 'operations':
    case 'sales_marketing':
    case 'administration':
    case 'training':
      return 'non_qualifying';
    case 'security':
      return 'unassessed';
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Un parte registrado el mismo día o el día natural siguiente es
 * contemporáneo. Todo lo anterior se conserva, pero queda marcado como
 * reconstruido para no presentar memoria retrospectiva como evidencia diaria.
 */
export function recordModeForWorkDate(workDate: string, recordedAt: Date): IpRecordMode {
  const recordedDay = isoDay(recordedAt);
  const work = Date.parse(`${workDate}T00:00:00.000Z`);
  const recorded = Date.parse(`${recordedDay}T00:00:00.000Z`);
  const differenceInDays = Math.floor((recorded - work) / 86_400_000);

  return differenceInDays <= 1 ? 'contemporaneous' : 'reconstructed';
}

export type IpProjectReadinessInput = {
  readonly hasExpectedOutcome: boolean;
  readonly hasTechnicalUncertainty: boolean;
  readonly logCount: number;
  readonly evidenceCount: number;
  readonly candidateMinutes: number;
  readonly contemporaneousCount: number;
  readonly ownerEqualsPayer: boolean;
};

export type IpProjectReadiness = {
  readonly score: number;
  readonly gaps: readonly string[];
};

/** Indicador documental, no porcentaje de probabilidad de obtener un beneficio fiscal. */
export function calculateProjectReadiness(input: IpProjectReadinessInput): IpProjectReadiness {
  let score = 0;
  const gaps: string[] = [];

  if (input.hasExpectedOutcome) score += 15;
  else gaps.push('Definir el resultado técnico esperado');

  if (input.hasTechnicalUncertainty) score += 20;
  else gaps.push('Documentar la incertidumbre técnica');

  if (input.logCount > 0) score += 20;
  else gaps.push('Registrar horas de trabajo');

  if (input.evidenceCount > 0) score += 15;
  else gaps.push('Vincular evidencia técnica verificable');

  if (input.candidateMinutes > 0) score += 10;
  else gaps.push('Separar desarrollo candidato de mantenimiento y operaciones');

  if (input.logCount > 0 && input.contemporaneousCount / input.logCount >= 0.8) score += 10;
  else gaps.push('Mejorar el registro diario contemporáneo');

  if (input.ownerEqualsPayer) score += 10;
  else gaps.push('Documentar la relación entre titular y entidad que soporta el coste');

  return { score, gaps };
}

