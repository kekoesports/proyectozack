import { z } from 'zod';

import type { Finding, Severidad } from './rules';
import { overallSeverity } from './rules';

/**
 * Informe estructurado de un agente.
 *
 * Los agentes programados **no devuelven texto libre**. Un párrafo bonito no se
 * puede filtrar, ni comparar con el del día anterior, ni convertir en una
 * alerta. Un contrato sí, y además obliga al modelo a decir de dónde saca cada
 * cosa: sin `evidenceRefs` un hallazgo no entra en el informe.
 *
 * Ver docs/agent-os/agents-tools-policies.md §4.
 */

export const SeveritySchema = z.enum(['info', 'warning', 'high', 'critical']);

export const ReportFindingSchema = z.object({
  code: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1_000),
  severity: SeveritySchema,
  /**
   * De dónde sale. Sin evidencia el hallazgo no se acepta: es lo que impide
   * que un modelo añada una incidencia que le pareció plausible.
   */
  evidenceRefs: z.array(z.string().max(80)).min(1).max(50),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const ReportRecommendationSchema = z.object({
  action: z.string().min(1).max(300),
  rationale: z.string().min(1).max(600),
});

export const DataFreshnessSchema = z.object({
  source: z.string().min(1).max(80),
  observedAt: z.string(),
  /** `unknown` es una respuesta válida y preferible a suponer que está fresco. */
  status: z.enum(['fresh', 'stale', 'unknown']),
});

export const AgentReportSchema = z.object({
  title: z.string().min(1).max(200),
  executiveSummary: z.string().min(1).max(2_000),
  severity: SeveritySchema,
  findings: z.array(ReportFindingSchema).max(50),
  recommendations: z.array(ReportRecommendationSchema).max(20),
  dataFreshness: z.array(DataFreshnessSchema).max(20),
});

export type AgentReport = z.infer<typeof AgentReportSchema>;

/**
 * Informe construido solo con las reglas, sin pasar por el modelo.
 *
 * Es el que se guarda si el modelo no está disponible, falla o devuelve algo
 * que no valida. Guardian tiene que seguir informando aunque no haya IA: la
 * detección nunca dependió de ella.
 */
export function buildDeterministicReport(
  hallazgos: readonly Finding[],
  contexto: { readonly ventana: string; readonly eventosRevisados: number },
): AgentReport {
  const severidad = overallSeverity(hallazgos);

  return {
    title: `Informe de infraestructura — ${contexto.ventana}`,
    executiveSummary:
      hallazgos.length === 0
        ? `Sin incidencias. Se revisaron ${contexto.eventosRevisados} señales.`
        : `${hallazgos.length} ${hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'} sobre ${contexto.eventosRevisados} señales revisadas. Severidad máxima: ${severidad}.`,
    severity: severidad,
    findings: hallazgos.map((h) => ({
      code: h.code,
      title: h.title,
      summary: h.summary,
      severity: h.severity,
      evidenceRefs: h.evidenceEventIds.map((id) => `event:${id}`),
      confidence: h.confidence,
    })),
    // Vacías a propósito: recomendar es justo lo que aporta el modelo, y un
    // informe determinista que inventara consejos genéricos ocuparía su sitio
    // sin aportar nada.
    recommendations: [],
    dataFreshness: [],
  };
}

/**
 * Valida el informe del modelo y **descarta los hallazgos inventados**.
 *
 * Un modelo puede añadir un hallazgo que suena razonable pero que ninguna
 * regla detectó. Aquí se cruzan los códigos con los de las reglas: lo que no
 * corresponda a un hallazgo real se cae. La IA reordena, explica y prioriza; no
 * añade incidencias.
 */
export function validateModelReport(
  crudo: unknown,
  hallazgosReales: readonly Finding[],
): { readonly ok: true; readonly report: AgentReport; readonly dropped: number } | { readonly ok: false; readonly issues: readonly string[] } {
  const parsed = AgentReportSchema.safeParse(crudo);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }

  const codigosReales = new Set(hallazgosReales.map((h) => h.code));
  const admitidos = parsed.data.findings.filter((f) => codigosReales.has(f.code));
  const descartados = parsed.data.findings.length - admitidos.length;

  // La severidad tampoco la decide el modelo: se recalcula desde los hallazgos
  // que sobrevivieron. Si no, bastaría con que exagerara para despertar a
  // alguien de madrugada.
  const severidad = admitidos.reduce<Severidad>((peor, f) => {
    const orden: Record<Severidad, number> = { info: 0, warning: 1, high: 2, critical: 3 };
    return orden[f.severity] > orden[peor] ? f.severity : peor;
  }, 'info');

  return {
    ok: true,
    report: { ...parsed.data, findings: admitidos, severity: severidad },
    dropped: descartados,
  };
}

/** Versión markdown, para leerla en el panel o pegarla en un mensaje. */
export function renderReportMarkdown(informe: AgentReport): string {
  const lineas: string[] = [`# ${informe.title}`, '', informe.executiveSummary, ''];

  if (informe.findings.length > 0) {
    lineas.push('## Hallazgos', '');
    for (const f of informe.findings) {
      lineas.push(`### ${f.title}`, '', `**${f.severity}** · confianza ${f.confidence}`, '', f.summary, '');
      lineas.push(`_Evidencia: ${f.evidenceRefs.join(', ')}_`, '');
    }
  }

  if (informe.recommendations.length > 0) {
    lineas.push('## Recomendaciones', '');
    for (const r of informe.recommendations) {
      lineas.push(`- **${r.action}** — ${r.rationale}`);
    }
    lineas.push('');
  }

  if (informe.dataFreshness.length > 0) {
    lineas.push('## Frescura de los datos', '');
    for (const d of informe.dataFreshness) {
      lineas.push(`- ${d.source}: ${d.status} (${d.observedAt})`);
    }
  }

  return lineas.join('\n');
}
