import type { StudioScene } from '@/lib/schemas/studio-production';

export type StudioMotion = NonNullable<StudioScene['motion']>;
export const LEGACY_MOTION_DESIGNS = [
  { id: 'statement-v1', name: 'Editorial', label: 'IDEAS QUE SE QUEDAN', title: 'El encaje importa.', body: 'Audiencia, contenido y contexto. No solo seguidores.', description: 'Titular protagonista, entrada escalonada y firma de color.' },
  { id: 'steps-v1', name: 'Un proceso claro', label: 'DE LA IDEA A LA ACCIÓN', title: 'Una idea. Un proceso.', body: 'Propuesta\nCoordinación\nPublicación', description: 'Tres tarjetas que se construyen una a una. Un paso por línea.' },
  { id: 'contact-v1', name: 'Siguiente paso', label: 'CONVERSACIONES REALES', title: '¿Lo hacemos juntos?', body: 'marketing@socialpro.es', description: 'Cierre con un bloque de contacto horizontal, limpio y legible.' },
] satisfies { id: StudioMotion; name: string; label: string; title: string; body: string; description: string }[];

export const STUDIO_MOTION_DESIGNS = [
  { id: 'statement-v2', name: 'Editorial', label: 'UNA IDEA CON FUERZA', title: 'El contexto cambia la jugada.', body: 'Antes del momento clave, cuenta qué está en juego.', description: 'Tipografía protagonista y bandas diagonales que entran por capas.' },
  { id: 'steps-v2', name: 'Paso a paso', label: 'DEL MOMENTO A LA HISTORIA', title: 'Un clip que se entiende.', body: 'Contexto\nJugada\nAprendizaje', description: 'Tarjetas numeradas con profundidad y entrada escalonada.' },
  { id: 'contact-v2', name: 'Contacto', label: 'EL SIGUIENTE PASO', title: 'Hablemos de tu idea.', body: 'marketing@socialpro.es', description: 'Banner horizontal de alto contraste con flecha animada.' },
  { id: 'compare-v1', name: 'Comparativa', label: 'DOS FORMAS DE CONTARLO', title: 'Del clip a la historia.', body: 'Solo la jugada\nLa jugada con contexto', description: 'Dos paneles enfrentados que entran desde lados opuestos.' },
  { id: 'checklist-v1', name: 'Checklist', label: 'ANTES DE PUBLICAR', title: 'Un brief claro.', body: 'Objetivo concreto\nAudiencia definida\nUna acción al final', description: 'Lista de comprobación con checks que se dibujan al aparecer.' },
  { id: 'metric-v1', name: 'Dato protagonista', label: 'MENOS RUIDO. MÁS FOCO.', title: 'Una idea por pieza.', body: 'Elige qué quieres que recuerden y construye el vídeo alrededor.', description: 'Un foco circular en movimiento enmarca el mensaje o dato real que introduzcas.' },
  { id: 'quiz-v1', name: 'Pregunta a tu comunidad', label: 'ABRE LA CONVERSACIÓN', title: '¿Qué habrías hecho tú?', body: 'Esperar al equipo\nBuscar información\nTomar la iniciativa', description: 'Pregunta con opciones A, B y C, reveladas una a una.' },
  { id: 'live-v1', name: 'Agenda de directo', label: 'DISEÑA TU PRÓXIMO LIVE', title: 'Un directo con intención.', body: 'Una pregunta de apertura\nUn momento para explicar\nUn cierre con la comunidad', description: 'Tarjeta de emisión con ondas y agenda; tú añades la fecha real si la hay.' },
  { id: 'timeline-v1', name: 'Línea de tiempo', label: 'EL DIRECTO NO TERMINA AL SALIR', title: 'Dale otra vida.', body: 'Elige un momento\nConviértelo en un clip\nRecoge las preguntas', description: 'Nodos conectados con una línea que se construye durante la escena.' },
  { id: 'quote-v1', name: 'Cita editorial', label: 'UNA IDEA PARA RECORDAR', title: 'No todo momento necesita ser un clip.', body: 'Prioriza los que aportan contexto, emoción o aprendizaje. — SocialPro', description: 'Comillas a gran escala, marco editorial y firma que aparece después.' },
] satisfies { id: StudioMotion; name: string; label: string; title: string; body: string; description: string }[];

export function motionDesign(id: StudioMotion) {
  const design = [...STUDIO_MOTION_DESIGNS, ...LEGACY_MOTION_DESIGNS].find((item) => item.id === id);
  if (!design) throw new Error('unknown_motion_version');
  return design;
}

/** Structure only: no invented metrics, talent names, consent, or paid generation. */
export function studioMotionSequence(id: 'founder' | 'creator' | 'campaign'): StudioScene[] {
  const content = {
    founder: [
      { title: 'Una historia que contar.', body: 'Quién soy, qué hago y lo que viene ahora.', motion: 'statement-v1' },
      { title: 'Una forma de trabajar.', body: 'Escuchar\nCrear\nCompartir', motion: 'steps-v1' },
      { title: 'Hablemos.', body: 'marketing@socialpro.es', motion: 'contact-v1' },
    ],
    creator: [
      { title: 'Detrás de cada jugada.', body: 'Una persona. Una comunidad. Una historia.', motion: 'statement-v1' },
      { title: 'Del momento a la historia.', body: 'Contexto\nJugada\nAprendizaje', motion: 'steps-v1' },
      { title: '¿Qué habrías hecho tú?', body: 'Cuéntalo en comentarios.', motion: 'contact-v1' },
    ],
    campaign: [
      { title: 'Una colaboración con sentido.', body: 'Empieza por el objetivo. Después, elige el contenido.', motion: 'statement-v1' },
      { title: 'Tres preguntas antes de crear.', body: '¿A quién llegamos?\n¿Qué contamos?\n¿Qué queremos conseguir?', motion: 'steps-v1' },
      { title: 'Tu próximo brief empieza aquí.', body: 'marketing@socialpro.es', motion: 'contact-v1' },
    ],
  } satisfies Record<string, { title: string; body: string; motion: StudioMotion }[]>;
  return content[id].map((scene) => ({ ...scene, id: crypto.randomUUID(), kind: 'title', assetId: null, duration: 5, start: 0 }));
}
