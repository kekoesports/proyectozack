import type { StudioProjectInput } from '@/lib/schemas/studio';
import type { StudioAssistantProposal } from '@/lib/schemas/studio-production';

/** Honest zero-provider assistant. No fabricated conversational AI or generated facts. */
export function editorialResponse(prompt: string, project: StudioProjectInput): StudioAssistantProposal {
  const words = project.script.split(/\s+/).filter(Boolean).length;
  const seconds = Math.ceil(words / 2.6);
  const checks = [
    'Conservar mandíbula, dientes y mirada: reutilizar la toma aprobada o una grabación real.',
    'Comprobar derechos de clips y música; no añadir subtítulos si no se solicitan.',
    'Separar equipo, creadores actuales y colaboradores. No inventar cifras ni resultados.',
  ];
  const query = prompt.toLocaleLowerCase('es');
  if (/duraci|ritmo|rápid|lento|tiempo/.test(query)) return { message: `Tu guion tiene ${words} palabras: aproximadamente ${seconds} s a 156 palabras/minuto. Es una estimación editorial, no una medición del audio. Para acelerar sin alterar tu voz, recorta pausas en la grabación o reduce el guion antes de animar.`, script: null, cta: null, checks };
  if (/revis|comprob|check|cara|dientes|ojo/.test(query)) return { message: 'Lista de revisión preparada. Esta ayuda editorial no ha analizado fotogramas ni escuchado el audio: revisa el render completo antes de aprobarlo. Los cambios de texto se montan sobre el material; no regeneran tu cara.', script: null, cta: null, checks };
  if (/escena|story|montaje|plano/.test(query)) return { message: 'Estructura recomendada para esta pieza: 1) Gancho, 2) Una explicación concreta, 3) Ejemplo real con derechos, 4) Una sola llamada a la acción. En Montaje puedes añadir y ordenar escenas, elegir material de tu biblioteca y exportar. Una nueva narración necesita audio propio o una generación autorizada; no reutilices el audio de presentación para un guion distinto.', script: null, cta: null, checks };
  if (/cta|llamada|cierre/.test(query)) return { message: 'Propuesta de cierre para revisar antes de aplicar. No cambia el resto del guion.', script: null, cta: '¿Tienes un proyecto gaming? Escríbenos a marketing@socialpro.es.', checks };
  return { message: 'Estoy en modo editorial sin consumo de IA. Puedo revisar duración, darte una lista de control, proponer una estructura de escenas o un cierre. Para redactar libremente sobre tu petición, activa el modo IA cuando la agencia conecte el proveedor. Tu mensaje queda guardado con este proyecto.', script: null, cta: null, checks };
}
