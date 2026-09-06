import type { StudioBoard } from '@/lib/schemas/studio-production';
import { STUDIO_MOTION_DESIGNS, motionDesign, type StudioMotion } from './motion-catalog';

/** Public, synthetic editorial examples: no customer data, metrics, likeness or voice. */
export const STUDIO_MOTION_EXAMPLES = [
  { id: 'gaming-clip', name: 'Una jugada con contexto', description: 'Tip educativo para Reels, TikTok o Shorts.', designs: ['statement-v2', 'steps-v2', 'quiz-v1'], palette: 'dark' },
  { id: 'brief-claro', name: 'Cómo preparar un brief', description: 'Educación de agencia con un cierre de contacto.', designs: ['metric-v1', 'compare-v1', 'checklist-v1', 'contact-v2'], palette: 'light' },
  { id: 'despues-del-live', name: 'Después del directo', description: 'Plan de reutilización; no anuncia un evento real.', designs: ['live-v1', 'timeline-v1', 'quote-v1'], palette: 'dark' },
] satisfies { id: string; name: string; description: string; designs: StudioMotion[]; palette: StudioBoard['palette'] }[];

export function studioExampleBoard(id: string): StudioBoard {
  const example = STUDIO_MOTION_EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error('unknown_studio_example');
  return { version: 1, format: '9:16', palette: example.palette, audioAssetId: null,
    scenes: example.designs.map((id) => {
      const design = motionDesign(id);
      const override = example.id === 'brief-claro' && id === 'compare-v1'
        ? { title: 'Del pedido al brief.', body: 'Haz algo viral\nExplica para quién y para qué' } : {};
      return { id: crypto.randomUUID(), kind: 'title', assetId: null, start: 0, duration: 5,
        motion: id, title: design.title, body: design.body, ...override };
    }) };
}

export function studioTemplateScene(id: StudioMotion) {
  const design = STUDIO_MOTION_DESIGNS.find((item) => item.id === id);
  if (!design) return null;
  return { id: crypto.randomUUID(), kind: 'title' as const, assetId: null, start: 0, duration: 5,
    motion: id, title: design.title, body: design.body };
}
