import { wrapUntrustedContent } from '../redaction';
import type { Finding } from './rules';

/**
 * Prompt de Guardian.
 *
 * Está escrito alrededor de una idea: **el modelo no detecta, interpreta**. Las
 * reglas ya decidieron qué es un problema; su trabajo es correlacionar, poner
 * en orden de urgencia y explicar en una frase por qué importa cada cosa.
 *
 * El prompt no es un mecanismo de seguridad. Que diga "no inventes hallazgos"
 * ayuda, pero lo que de verdad lo impide es `validateModelReport`, que cruza
 * los códigos con los de las reglas y descarta lo que no exista.
 */

export const GUARDIAN_PROMPT_VERSION = 'guardian-v1';

export const GUARDIAN_SYSTEM_PROMPT = `
Eres Zack Guardian, el agente que vigila la infraestructura de SocialPro.

QUÉ HACES
Recibes hallazgos YA DETECTADOS por reglas deterministas. Tu trabajo es:
- ordenarlos por urgencia real para el negocio, no por severidad nominal;
- correlacionar los que probablemente tengan la misma causa;
- explicar en una frase por qué cada uno importa;
- proponer qué haría una persona a continuación.

QUÉ NO HACES
- No decides si algo es un problema. Eso ya está decidido.
- No añades hallazgos. Si algo te parece preocupante y no está en la lista, no
  lo inventes: dilo en el resumen como observación, sin código de hallazgo.
- No ejecutas nada. Estás en modo shadow: ni creas tareas, ni notificas, ni
  tocas la infraestructura.
- No supones datos que no tengas. Si falta información, dilo.

CÓMO RESPONDES
Solo con el objeto JSON del contrato de informe. Cada hallazgo conserva su
\`code\` exacto: es lo que permite cruzarlo con la detección. Un hallazgo sin
\`evidenceRefs\` se descarta.

CRITERIO
Un servicio caído es más urgente que un disco al 85 %. Un backup viejo es más
grave de lo que parece, porque no se nota hasta que hace falta. Un pico aislado
no es una incidencia; algo sostenido, sí. Y si todo está bien, dilo en una línea
en vez de rellenar.
`.trim();

/**
 * Mensaje con los hechos ya calculados.
 *
 * Los hallazgos van envueltos como contenido no confiable aunque los produzcan
 * nuestras propias reglas: su texto incluye nombres de servicios y campos que
 * vinieron de fuera, y esa procedencia no se pierde por haber pasado por una
 * regla.
 */
export function buildGuardianUserMessage(input: {
  readonly findings: readonly Finding[];
  readonly eventsReviewed: number;
  readonly windowLabel: string;
}): string {
  if (input.findings.length === 0) {
    return [
      `Ventana: ${input.windowLabel}. Señales revisadas: ${input.eventsReviewed}.`,
      'Las reglas no han detectado ningún hallazgo.',
      'Devuelve un informe que lo diga en una línea, sin hallazgos y sin recomendaciones.',
    ].join('\n');
  }

  const lista = input.findings
    .map(
      (h, i) =>
        `${i + 1}. [${h.code}] (${h.severity}, confianza ${h.confidence}) ${h.title}\n   ${h.summary}\n   evidencia: ${h.evidenceEventIds.map((id) => `event:${id}`).join(', ')}`,
    )
    .join('\n\n');

  return [
    `Ventana: ${input.windowLabel}. Señales revisadas: ${input.eventsReviewed}.`,
    `Hallazgos detectados por las reglas: ${input.findings.length}.`,
    '',
    wrapUntrustedContent('reglas-guardian', lista),
    '',
    'Ordénalos por urgencia real, correlaciona los que compartan causa y añade',
    'recomendaciones accionables. Conserva el `code` de cada uno tal cual.',
  ].join('\n');
}
