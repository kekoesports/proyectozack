'server-only';

// Patrones de solicitudes que el asistente debe rechazar o redirigir.
// El sistema responde con un mensaje de bloqueo en lugar de ejecutar.

const BLOCKED_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\benv[ií]ar?\b.{0,30}(dinero|pago|transferencia)/i, reason: 'pagos' },
  { pattern: /\btransfer(ir|encia)\b/i, reason: 'pagos' },
  { pattern: /\bborrar?\b.{0,30}(factura|dato|registro|cliente|talento|marca|todos)/i, reason: 'borrado de datos' },
  { pattern: /\belimin(ar|a)\b.{0,30}(factura|dato|registro|cliente|talento|marca|todos)/i, reason: 'borrado de datos' },
  { pattern: /\bmodific(ar|a)\b.{0,30}\bimport(e|es)\b/i, reason: 'modificación de importes' },
  { pattern: /\bcambiar?\b.{0,30}\bimport(e|es)\b/i, reason: 'modificación de importes' },
  { pattern: /\bmarcar?\b.{0,60}(cobrad[ao]|pagad[ao])/i, reason: 'cambio de estado de factura' },
  { pattern: /\bcambiar?\b.{0,30}\bdatos?\s+fiscal/i, reason: 'datos fiscales' },
  { pattern: /\b(secreto|token|iban\s+completo|contraseña)\b/i, reason: 'datos sensibles' },
  { pattern: /\bejecutar?\s+sql\b/i, reason: 'acceso directo a BD' },
  { pattern: /base\s+de\s+datos/i, reason: 'acceso directo a BD' },
  { pattern: /\benv[ií]ar?\b.{0,30}(email|correo|factura)/i, reason: 'envío automático de emails' },
  { pattern: /\bcrear?\b.{0,30}factura.{0,20}automat/i, reason: 'creación automática de facturas' },
  { pattern: /\baplicar?\b.{0,40}(cobro|pago|concili)/i, reason: 'aplicación automática de cobros/pagos' },
  { pattern: /\bconcíliamelo?\b/i, reason: 'aplicación automática de cobros/pagos' },
  { pattern: /\baplica.{0,20}(este|el|la).{0,20}(pago|cobro)/i, reason: 'aplicación automática de cobros/pagos' },
  { pattern: /\b(stripe|wise)\b/i, reason: 'conexión con bancos o pagos reales' },
  { pattern: /\bvariables?\s+de\s+entorno\b/i, reason: 'acceso a variables de entorno' },
  { pattern: /api[_\s-]?key/i, reason: 'acceso a claves API' },
];

export type GuardrailResult =
  | { blocked: false }
  | { blocked: true; reason: string; message: string };

export function checkGuardrails(userMessage: string): GuardrailResult {
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        blocked: true,
        reason,
        message: `Puedo ayudarte a revisar la información y preparar una sugerencia, pero la acción de "${reason}" requiere aprobación humana. En esta fase el asistente es solo de consulta y análisis.`,
      };
    }
  }
  return { blocked: false };
}

// System prompt restrictivo que se incluye en cada conversación
export const SAFETY_SYSTEM_INSTRUCTIONS = `
RESTRICCIONES ABSOLUTAS — NO NEGOCIABLES:
- Nunca ejecutes pagos, transferencias ni acciones bancarias.
- Nunca borres, modifiques ni crees facturas, contratos ni datos fiscales.
- Nunca marques facturas como cobradas, pagadas o anuladas automáticamente.
- Nunca envíes emails ni notificaciones externas.
- Nunca reveles tokens, contraseñas, IBANs completos, claves API ni datos privados completos.
- Si el usuario pide cualquiera de estas cosas, responde con: "Esta acción requiere aprobación humana. Puedo ayudarte a analizar la información y preparar la sugerencia, pero la ejecución la debe hacer un administrador."
- Solo puedes LEER datos y EXPLICAR información. Eres un asistente analítico de solo lectura.
`.trim();
