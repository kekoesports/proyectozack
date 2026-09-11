import { NoteSuggestion, type NoteActor } from '@/lib/schemas/quickNote';
import { canAssignTasksToOthers } from './access';
import { civilDate, addCivilDays, madridInstant } from './time';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const VERBS =
  /\b(pedir|reclamar|hablar|llamar|enviar|revisar|preparar|confirmar|contactar|cobrar|renovar|recordar|recordarme|recuerdame|hacer|crear|solicitar|comprobar|montar|aprobar)\b/g;
const weekdays = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];
export type NoteUser = { id: string; name: string };

/** Conservative local interpretation only. Names do not create relations; dates never imply a contractual deadline. */
export function interpretQuickNote(
  body: string,
  createdAt: Date,
  actor: NoteActor,
  users: readonly NoteUser[],
): NoteSuggestion {
  const text = normalize(body);
  const author = users.find((u) => u.id === actor.userId);
  const result: NoteSuggestion = {
    kind: 'information',
    title: body.replace(/\s+/g, ' ').slice(0, 200),
    assigneeId: actor.userId,
    assigneeName: author?.name ?? 'Yo',
    startDate: null,
    dueDate: null,
    remindAt: null,
    reason: '',
  };
  const verbs = [...text.matchAll(VERBS)];
  if (verbs.length) result.kind = 'action';
  if (
    verbs.length &&
    /\b(no|nunca|ya|prefiere|quiere|queria|dice)\b/.test(text)
  ) {
    result.kind = 'confirm';
    result.reason =
      'La frase puede describir una preferencia, una negación o algo ya realizado. Confirma si necesita tarea.';
  }
  if (
    /\b(quizas|tal vez|podriamos|a lo mejor|idea|algun dia)\b/.test(text) ||
    verbs.length > 1 ||
    /[\n;]/.test(body)
  ) {
    result.kind = 'confirm';
    result.reason =
      'Parece una idea o contiene varias acciones. Revisa una única tarea antes de convertir.';
  }
  const mention = text.match(/@([\p{L}\p{N}_.-]+)/u)?.[1];
  if (mention) {
    const matches = users.filter(
      (u) =>
        normalize(u.name) === mention ||
        normalize(u.name).split(/\s+/)[0] === mention,
    );
    const matched = matches.length === 1 ? matches[0] : undefined;
    if (
      matched &&
      (matched.id === actor.userId || canAssignTasksToOthers(actor.role))
    ) {
      result.assigneeId = matched.id;
      result.assigneeName = matched.name;
    }
    result.kind = 'confirm';
    result.reason = !matched
      ? 'La mención no identifica a una única persona. Elige responsable.'
      : matched.id !== actor.userId && !canAssignTasksToOthers(actor.role)
        ? 'Solo puedes asignarte tareas propias.'
        : 'Confirma el responsable y el texto de la tarea que podrá ver.';
  }
  const today = civilDate(createdAt);
  let date: string | null = null;
  if (/\bpasado manana\b/.test(text)) date = addCivilDays(today, 2);
  else if (/\bmanana\b/.test(text)) date = addCivilDays(today, 1);
  else if (/\bhoy\b/.test(text)) date = today;
  else {
    const weekday = weekdays.findIndex((day) =>
      new RegExp('\\b' + day + '\\b').test(text),
    );
    if (weekday >= 0)
      date = addCivilDays(
        today,
        (weekday - new Date(today + 'T12:00:00Z').getUTCDay() + 7) % 7,
      );
  }
  const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  if (explicit) {
    const parsed = new Date(explicit + 'T12:00:00Z');
    if (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === explicit
    )
      date = explicit;
    else {
      result.kind = 'confirm';
      result.reason = 'La fecha no es válida. Revísala.';
    }
  }
  if (date) {
    if (
      /\b(fecha limite|vence|vencimiento|plazo|antes del|antes de)\b/.test(text)
    )
      result.dueDate = date;
    else result.startDate = date;
  }
  if (
    /\b(semana que viene|semana proxima|proxima semana|mes que viene)\b/.test(
      text,
    ) ||
    (date && /\b(proximo|proxima)\b/.test(text))
  ) {
    result.kind = 'confirm';
    result.startDate = null;
    result.dueDate = null;
    result.reason =
      'Confirma la fecha exacta; no se ha elegido entre semanas posibles.';
  }
  if (
    /\b(recuerdame|recordarme|recordar|avisame|aviso|recordatorio)\b/.test(text)
  ) {
    const hours = text.match(/\ben (\d{1,3}) horas?\b/)?.[1];
    const clock = text.match(/\ba las? (\d{1,2})(?::(\d{2}))?\b/);
    if (hours && Number(hours) > 0)
      result.remindAt = new Date(
        createdAt.getTime() + Number(hours) * 3_600_000,
      ).toISOString();
    else if (date && clock)
      result.remindAt = madridInstant(
        date +
          'T' +
          (clock[1] ?? '').padStart(2, '0') +
          ':' +
          (clock[2] ?? '00'),
      );
    if (!result.remindAt) {
      result.kind = 'confirm';
      result.reason = 'Indica una hora concreta para el recordatorio.';
    }
  }
  // Unsupported relative dates are proposals, never silently scheduled.
  if (
    !date &&
    /\b(navidad|semana|mes|proximo|proxima|dias?|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(
      text,
    )
  ) {
    result.kind = 'confirm';
    result.reason = 'La fecha necesita revisión; no se ha inventado una fecha.';
  }
  const parsed = NoteSuggestion.safeParse(result);
  if (!parsed.success) throw new Error('Invalid note interpretation');
  return parsed.data;
}
