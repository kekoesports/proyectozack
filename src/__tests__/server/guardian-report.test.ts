/**
 * Informe de Guardian y sus límites.
 *
 * Lo importante: **el modelo no puede añadir hallazgos**. Puede reordenar,
 * explicar y recomendar; lo que no esté detectado por las reglas se descarta al
 * validar. El prompt lo pide, pero lo que lo impide es este código.
 *
 * Y hay una segunda regla igual de importante: la severidad no la decide el
 * modelo. Si la decidiera, bastaría con que exagerara para despertar a alguien
 * de madrugada.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  GUARDIAN_ALLOWLIST,
  GUARDIAN_SCHEDULES,
  GUARDIAN_DEFINITION,
} from '@/lib/agents/guardian/definition';
import { GUARDIAN_SYSTEM_PROMPT, buildGuardianUserMessage } from '@/lib/agents/guardian/prompt';
import {
  AgentReportSchema,
  buildDeterministicReport,
  renderReportMarkdown,
  validateModelReport,
} from '@/lib/agents/guardian/report';
import type { Finding } from '@/lib/agents/guardian/rules';

const HALLAZGO_REAL: Finding = {
  code: 'disk_critical',
  title: 'Disco al 91 %',
  summary: 'Ocupación por encima del umbral crítico.',
  severity: 'critical',
  evidenceEventIds: [1, 2],
  confidence: 'high',
};

const INFORME_BASE = {
  title: 'Informe de infraestructura',
  executiveSummary: 'Un problema.',
  severity: 'critical' as const,
  findings: [
    {
      code: 'disk_critical',
      title: 'Disco al 91 %',
      summary: 'Explicado por el modelo.',
      severity: 'critical' as const,
      evidenceRefs: ['event:1'],
      confidence: 'high' as const,
    },
  ],
  recommendations: [{ action: 'Liberar espacio', rationale: 'PostgreSQL puede dejar de escribir.' }],
  dataFreshness: [{ source: 'collector', observedAt: '2026-08-21T10:00:00.000Z', status: 'fresh' as const }],
};

describe('informe determinista', () => {
  it('se construye sin pasar por el modelo', () => {
    // Guardian tiene que seguir informando aunque no haya IA: la detección
    // nunca dependió de ella.
    const informe = buildDeterministicReport([HALLAZGO_REAL], { ventana: '24 h', eventosRevisados: 120 });
    expect(informe.severity).toBe('critical');
    expect(informe.findings).toHaveLength(1);
    expect(AgentReportSchema.safeParse(informe).success).toBe(true);
  });

  it('sin hallazgos lo dice en una línea', () => {
    const informe = buildDeterministicReport([], { ventana: '24 h', eventosRevisados: 120 });
    expect(informe.severity).toBe('info');
    expect(informe.executiveSummary).toMatch(/sin incidencias/i);
    expect(informe.findings).toHaveLength(0);
  });

  it('no inventa recomendaciones', () => {
    // Recomendar es justo lo que aporta el modelo; rellenar con consejos
    // genéricos ocuparía su sitio sin aportar nada.
    const informe = buildDeterministicReport([HALLAZGO_REAL], { ventana: '24 h', eventosRevisados: 5 });
    expect(informe.recommendations).toHaveLength(0);
  });

  it('cada hallazgo cita su evidencia', () => {
    const informe = buildDeterministicReport([HALLAZGO_REAL], { ventana: '24 h', eventosRevisados: 5 });
    expect(informe.findings[0]?.evidenceRefs).toEqual(['event:1', 'event:2']);
  });
});

describe('validación del informe del modelo', () => {
  it('acepta uno bien formado con hallazgos reales', () => {
    const r = validateModelReport(INFORME_BASE, [HALLAZGO_REAL]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report.findings).toHaveLength(1);
      expect(r.dropped).toBe(0);
    }
  });

  it('DESCARTA un hallazgo que ninguna regla detectó', () => {
    // Es la garantía central: la IA interpreta, no detecta.
    const conInventado = {
      ...INFORME_BASE,
      findings: [
        ...INFORME_BASE.findings,
        {
          code: 'servidor_hackeado',
          title: 'Intrusión detectada',
          summary: 'Me lo ha parecido.',
          severity: 'critical' as const,
          evidenceRefs: ['event:99'],
          confidence: 'high' as const,
        },
      ],
    };

    const r = validateModelReport(conInventado, [HALLAZGO_REAL]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.report.findings).toHaveLength(1);
      expect(r.report.findings[0]?.code).toBe('disk_critical');
      expect(r.dropped).toBe(1);
    }
  });

  it('recalcula la severidad desde los hallazgos que sobreviven', () => {
    // Si la decidiera el modelo, bastaría con exagerar para despertar a alguien
    // de madrugada.
    const exagerado = { ...INFORME_BASE, severity: 'critical' as const, findings: [] };
    const r = validateModelReport(exagerado, [HALLAZGO_REAL]);
    expect(r.ok && r.report.severity).toBe('info');
  });

  it('rechaza un hallazgo sin evidencia', () => {
    const sinEvidencia = {
      ...INFORME_BASE,
      findings: [{ ...INFORME_BASE.findings[0], evidenceRefs: [] }],
    };
    expect(validateModelReport(sinEvidencia, [HALLAZGO_REAL]).ok).toBe(false);
  });

  it('rechaza una respuesta que no es un informe', () => {
    expect(validateModelReport('lo siento, no puedo ayudarte con eso', [HALLAZGO_REAL]).ok).toBe(false);
    expect(validateModelReport(null, [HALLAZGO_REAL]).ok).toBe(false);
    expect(validateModelReport({ titulo: 'mal' }, [HALLAZGO_REAL]).ok).toBe(false);
  });

  it('acota los textos largos', () => {
    const larguisimo = { ...INFORME_BASE, executiveSummary: 'x'.repeat(5_000) };
    expect(validateModelReport(larguisimo, [HALLAZGO_REAL]).ok).toBe(false);
  });

  it('acota el número de hallazgos', () => {
    const muchos = {
      ...INFORME_BASE,
      findings: Array.from({ length: 60 }, () => INFORME_BASE.findings[0]),
    };
    expect(validateModelReport(muchos, [HALLAZGO_REAL]).ok).toBe(false);
  });
});

describe('markdown', () => {
  it('incluye hallazgos, evidencia y recomendaciones', () => {
    const md = renderReportMarkdown(INFORME_BASE);
    expect(md).toContain('Disco al 91 %');
    expect(md).toContain('event:1');
    expect(md).toContain('Liberar espacio');
  });

  it('un informe sin hallazgos no deja secciones vacías', () => {
    const md = renderReportMarkdown(buildDeterministicReport([], { ventana: '24 h', eventosRevisados: 10 }));
    expect(md).not.toContain('## Hallazgos');
  });
});

describe('prompt', () => {
  it('le dice explícitamente que no añada hallazgos', () => {
    expect(GUARDIAN_SYSTEM_PROMPT).toMatch(/no añades hallazgos/i);
  });

  it('le dice que no ejecuta nada durante shadow', () => {
    expect(GUARDIAN_SYSTEM_PROMPT).toMatch(/shadow/i);
    expect(GUARDIAN_SYSTEM_PROMPT).toMatch(/no ejecutas/i);
  });

  it('envuelve los hallazgos como contenido no confiable', () => {
    // Su texto incluye nombres de servicios que vinieron de fuera, y esa
    // procedencia no se pierde por haber pasado por una regla.
    const mensaje = buildGuardianUserMessage({
      findings: [HALLAZGO_REAL],
      eventsReviewed: 100,
      windowLabel: '24 h',
    });
    expect(mensaje).toContain('DATOS_NO_CONFIABLES');
  });

  it('sin hallazgos pide un informe corto, no uno relleno', () => {
    const mensaje = buildGuardianUserMessage({ findings: [], eventsReviewed: 100, windowLabel: '24 h' });
    expect(mensaje).toMatch(/sin hallazgos/i);
  });
});

describe('definición de Guardian', () => {
  it('todas sus tools son de lectura de infraestructura o agentes', () => {
    expect(GUARDIAN_ALLOWLIST).toContain('getOpenOperationalIncidents');
    expect(GUARDIAN_ALLOWLIST).toContain('getSystemHealthSnapshot');
  });

  it('no alcanza ninguna tool financiera ni de campañas', () => {
    for (const prohibida of ['getBillingSummary', 'getActiveCampaigns', 'getUnmatchedBankTransactions']) {
      expect(GUARDIAN_ALLOWLIST).not.toContain(prohibida);
    }
  });

  it('sus rutinas están definidas y ninguna se activa sola', () => {
    expect(GUARDIAN_SCHEDULES.map((s) => s.slug)).toEqual([
      'guardian-daily',
      'guardian-weekly-capacity',
    ]);
    // El seed las escribe con enabled: false; el objeto ni siquiera lleva ese
    // campo, para que no haya forma de sembrarlas activas por descuido.
    for (const rutina of GUARDIAN_SCHEDULES) {
      expect(Object.keys(rutina)).not.toContain('enabled');
    }
  });

  it('la diaria no recupera ventanas perdidas', () => {
    // Un informe de infraestructura de anteayer no le sirve a nadie.
    const diaria = GUARDIAN_SCHEDULES.find((s) => s.slug === 'guardian-daily');
    expect(diaria?.catchUpPolicy).toBe('skip');
  });

  it('los criterios para salir de shadow están escritos', () => {
    expect(GUARDIAN_DEFINITION.exitShadowCriteria.length).toBeGreaterThanOrEqual(5);
    expect(GUARDIAN_DEFINITION.exitShadowCriteria.join(' ')).toMatch(/14 días/);
  });
});
