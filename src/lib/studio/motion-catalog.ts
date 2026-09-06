import type { StudioScene } from '@/lib/schemas/studio-production';

export type StudioMotion = NonNullable<StudioScene['motion']>;
export const STUDIO_MOTION_DESIGNS = [
  { id: 'statement-v1', name: 'Editorial', label: 'IDEAS QUE SE QUEDAN', title: 'El encaje importa.', body: 'Audiencia, contenido y contexto. No solo seguidores.', description: 'Titular protagonista, entrada escalonada y firma de color.' },
  { id: 'steps-v1', name: 'Un proceso claro', label: 'DE LA IDEA A LA ACCIÓN', title: 'Una idea. Un proceso.', body: 'Propuesta\nCoordinación\nPublicación', description: 'Tres tarjetas que se construyen una a una. Un paso por línea.' },
  { id: 'contact-v1', name: 'Siguiente paso', label: 'CONVERSACIONES REALES', title: '¿Lo hacemos juntos?', body: 'marketing@socialpro.es', description: 'Cierre con un bloque de contacto horizontal, limpio y legible.' },
] satisfies { id: StudioMotion; name: string; label: string; title: string; body: string; description: string }[];

export function motionDesign(id: StudioMotion) {
  const design = STUDIO_MOTION_DESIGNS.find((item) => item.id === id);
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
