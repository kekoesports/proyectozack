'use server';
import { requireCreator } from '@/lib/studio/access';
import { StudioMotionPreviewInput } from '@/lib/schemas/studio-production';
import { studioMotionDocument } from '@/lib/studio/motion-document';
import { studioPreviewFonts } from '@/lib/studio/motion-preview';

export async function previewStudioMotion(input: unknown) {
  const { repository } = await requireCreator();
  const parsed = StudioMotionPreviewInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Revisa el diseño y el texto.' };
  if (!parsed.data.scene.motion) return { ok: false as const, error: 'Elige un diseño HyperFrames para previsualizarlo.' };
  if (!await repository.project(parsed.data.projectId)) return { ok: false as const, error: 'Proyecto no disponible.' };
  try {
    const fonts = await studioPreviewFonts();
    return { ok: true as const, html: studioMotionDocument(parsed.data.scene, parsed.data, fonts, true) };
  } catch { return { ok: false as const, error: 'No se pudo preparar la previsualización.' }; }
}
