'use server';
import { revalidatePath } from 'next/cache';
import { requireStudioWriter } from '@/lib/studio/access';
import { env } from '@/lib/env';
import { StudioBoardSave, StudioRenderRequest, StudioChatRequest, StudioAssistantProposal, StudioScheduleInput } from '@/lib/schemas/studio-production';
import { StudioProjectInput, StudioId } from '@/lib/schemas/studio';
import { editorialResponse } from '@/lib/studio/editorial-assistant';
import { draftWithAI } from '@/lib/studio/assistant';

const failure = (error: string) => ({ ok: false as const, error });
export async function saveStudioBoard(input: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return failure('El espacio cambió. Actualiza antes de guardar.');
  const { production } = actor;
  const parsed = StudioBoardSave.safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? 'Montaje no válido.');
  try {
    const { projectId, revision, document } = parsed.data;
    const result = await production.saveBoard(projectId, revision, document);
    if (!result) return failure('No se guardó: revisa la versión y los permisos del material.');
    revalidatePath(`/studio/projects/${projectId}`);
    return { ok: true as const, revision: result.revision };
  } catch { return failure('No se pudo guardar el montaje. Conserva tus cambios.'); }
}
export async function renderStudioBoard(input: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return failure('El espacio cambió. Actualiza antes de exportar.');
  const { production } = actor;
  if (!env.STUDIO_RENDER_ENABLED) return failure('El trabajador de vídeo aún no está activado en este entorno.');
  const parsed = StudioRenderRequest.safeParse(input);
  if (!parsed.success) return failure('Versión de montaje no válida.');
  try {
    const { projectId, projectRevision, boardRevision } = parsed.data;
    const job = await production.enqueue(projectId, projectRevision, boardRevision);
    if (!job) return failure('Guarda el montaje, actualiza la versión o revisa el límite diario de 10 exportaciones por proyecto.');
    revalidatePath(`/studio/projects/${projectId}`);
    return { ok: true as const, id: job.id };
  } catch { return failure('No se pudo confirmar la exportación. Actualiza antes de repetir.'); }
}
export async function sendStudioMessage(input: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return failure('El espacio cambió. Actualiza antes de enviar.');
  const { repository, production } = actor;
  const parsed = StudioChatRequest.safeParse(input);
  if (!parsed.success) return failure('Mensaje no válido.');
  const request = parsed.data;
  if (request.mode === 'ai' && !env.AI_GATEWAY_API_KEY) return failure('Falta conectar el proveedor del chat. Puedes usar las ayudas editoriales sin créditos.');
  try {
    const project = StudioProjectInput.safeParse(await repository.project(request.projectId));
    if (!project.success) return failure('Proyecto no disponible.');
    const engine = request.mode === 'ai' ? env.STUDIO_AI_MODEL : 'editorial-rules-v1';
    if (!await production.beginTurn({ ...request, engine })) return failure('El mensaje ya existe, cambió la versión o alcanzaste 30 peticiones hoy para esta pieza. Actualiza para ver el historial.');
    try {
      if (request.mode === 'ai') {
        const [profile, history] = await Promise.all([repository.profile(), production.turns(request.projectId)]);
        const generated = await draftWithAI(request.prompt, project.data, profile, history.filter((t) => t.status === 'complete').reverse());
        await production.finishTurn(request.id, generated.output, generated.usage);
      } else await production.finishTurn(request.id, editorialResponse(request.prompt, project.data));
    } catch { await production.finishTurn(request.id, null); }
    revalidatePath(`/studio/projects/${request.projectId}`);
    return { ok: true as const };
  } catch { return failure('No se pudo confirmar el mensaje. Actualiza el historial antes de reenviarlo.'); }
}
export async function applyStudioProposal(projectId: unknown, turnId: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return failure('El espacio cambió. Actualiza antes de aplicar cambios.');
  const { repository, production } = actor;
  const projectKey = StudioId.safeParse(projectId);
  const turnKey = StudioId.safeParse(turnId);
  if (!projectKey.success || !turnKey.success) return failure('Propuesta no válida.');
  try {
    const [project, turns] = await Promise.all([repository.project(projectKey.data), production.turns(projectKey.data)]);
    const turn = turns.find((t) => t.id === turnKey.data && t.status === 'complete');
    const proposal = StudioAssistantProposal.safeParse(turn?.proposal);
    const parsedProject = StudioProjectInput.safeParse(project);
    if (!project || !parsedProject.success || !turn || !proposal.success || project.revision !== turn.projectRevision)
      return failure('Esta propuesta corresponde a otra versión. Solicita una nueva sobre el guion actual.');
    if (proposal.data.script === null && proposal.data.cta === null) return failure('Esta respuesta no contiene cambios de guion.');
    const saved = await repository.save({ ...parsedProject.data, script: proposal.data.script ?? project.script, cta: proposal.data.cta ?? project.cta }, { id: project.id, revision: project.revision });
    if (!saved) return failure('La versión cambió. No se sobrescribió el guion.');
    revalidatePath(`/studio/projects/${project.id}`);
    return { ok: true as const };
  } catch { return failure('No se pudo aplicar. Tu versión anterior permanece guardada.'); }
}
export async function scheduleStudioProject(input: unknown, workspace?: unknown) {
  const actor = await requireStudioWriter(workspace);
  if (!actor) return failure('El espacio cambió. Actualiza antes de planificar.');
  const { production } = actor;
  const parsed = StudioScheduleInput.safeParse(input);
  if (!parsed.success) return failure('Fecha no válida.');
  try {
    const date = new Date(parsed.data.scheduledAt);
    if (Math.abs(date.getTime() - Date.now()) > 366 * 86400000) return failure('Elige una fecha dentro del próximo año.');
    if (!await production.plan(parsed.data.projectId, date)) return failure('Proyecto no disponible.');
    revalidatePath('/studio/calendar');
    return { ok: true as const };
  } catch { return failure('No se pudo guardar la fecha.'); }
}
