import Link from 'next/link';
import { requireAnyRole } from '@/lib/auth-guard';
import { env } from '@/lib/env';
import { creatorIntake } from '@/lib/queries/creatorIntake';
import { IntakeSearch } from '@/lib/schemas/creatorIntake';
import { QUALIFICATION_LABELS } from '@/lib/intake/qualification';
import { IntakeControls } from '@/features/admin/captacion/IntakeControls';
import { IntakeProfileCard } from '@/features/admin/captacion/IntakeProfileCard';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { db } from '@/lib/db';
import { intakeInbox } from '@/db/schema/intakeReliability';
import { desc, eq } from 'drizzle-orm';
import { IntakeWahaMessage } from '@/lib/schemas/intakeWaha';
import { InboxControls } from '@/features/admin/captacion/InboxControls';

export const metadata = { title: 'Captación de creadores | SocialPro' };
export const dynamic = 'force-dynamic';
const STATES: Record<string, string> = { bot: 'Asistente', waiting_human: 'Necesita atención', human: 'Atención humana', closed: 'Cerrada' };
const DELIVERY: Record<string, string> = { pending: 'Pendiente de envío', sending: 'Envío sin confirmar', accepted: 'Aceptado por el canal', uncertain: 'Entrega por revisar', cancelled: 'Cancelado' };
const REASONS: Record<string, string> = {
  human: 'Ha pedido hablar con una persona', commercial: 'Consulta comercial', upset: 'Necesita atención personal',
  uncertain: 'Datos por aclarar', extraction_failed: 'No se pudo interpretar el mensaje', age_review: 'Revisar edad y encaje',
  profile_ready: 'Perfil listo para valorar', delivery_uncertain: 'Entrega de mensaje por revisar',
  owner_replied: 'Has respondido desde tu cuenta', manual_control: 'Control manual', stop_requested: 'Ha pedido detener el contacto',
  connection_disabled: 'Conexión del canal desactivada',
  passive_contact_capture: 'Registrado para atención personal; fuera del piloto de respuestas',
  metrics_review: 'Estadísticas recibidas; revisión del equipo',
};

async function readInboxFailures() {
  const rows = await db.select().from(intakeInbox).where(eq(intakeInbox.status, 'failed'))
    .orderBy(desc(intakeInbox.receivedAt)).limit(20);
  const threshold = Date.now() - 180_000;
  return rows.map((row) => {
    const message = IntakeWahaMessage.safeParse(row.payload.payload);
    return { ...row, recent: row.receivedAt.getTime() > threshold && message.success && message.data.timestamp * 1000 > threshold };
  });
}

export default async function IntakePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = IntakeSearch.safeParse(await searchParams);
  if (!parsed.success) return <p>La conversación solicitada no es válida. <Link href="/admin/captacion">Volver</Link></p>;
  // Disabled installs do not query tables before their reviewed migration is deployed.
  const conversations = env.CREATOR_INTAKE_ENABLED ? await creatorIntake.list() : [];
  const selectedId = parsed.data.id ?? conversations[0]?.id;
  const detail = env.CREATOR_INTAKE_ENABLED && selectedId ? await creatorIntake.detail(selectedId) : null;
  const failures = env.CREATOR_INTAKE_ENABLED ? await readInboxFailures() : [];
  const outsidePilot = detail?.conversation.channel === 'whatsapp' && detail.conversation.accountId.startsWith('waha:')
    && !env.CREATOR_INTAKE_WHATSAPP_CHATS?.split(',').includes(detail.conversation.chatId);
  return (
    <div className="space-y-5 text-sp-admin-text">
      <AdminPageHeader title="Captación de creadores" subtitle="Mensajería de SocialPro · historial, perfil y atención personal" />
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 text-sm">
        {!env.CREATOR_INTAKE_ENABLED ? 'Preparado para pruebas. El asistente todavía no está activado.'
          : !env.CREATOR_INTAKE_SEND_ENABLED ? 'Modo revisión: se guardan propuestas; no se envían respuestas.' : 'Piloto: solo atiende los chats habilitados de los canales conectados.'}
        <p className="mt-1 text-sp-admin-muted">Al tomar una conversación, el asistente se pausa. Continúa desde el chat original en tu móvil.</p>
        {outsidePilot && <p className="mt-2 font-medium">Este contacto está fuera del piloto de respuestas: necesita atención personal aunque su estado anterior indicase «Asistente».</p>}
      </div>
      {failures.length > 0 && <section className="space-y-3 rounded-xl border border-sp-orange p-4" aria-label="Mensajes que necesitan revisión">
        <h2 className="font-semibold">Mensajes que necesitan revisión ({failures.length})</h2>
        <p className="text-sm">Estas entradas se conservaron, pero no se completó su procesamiento. Revisa el chat original antes de responder. Los mensajes antiguos no se reenvían automáticamente.</p>
        {failures.map((item) => {
          const message = IntakeWahaMessage.safeParse(item.payload.payload);
          return <article key={item.id} className="border-t border-sp-admin-border pt-2 text-sm">
            <p>{item.receivedAt.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} · {item.reason === 'stale-needs-review' ? 'Pendiente tras una interrupción' : 'Reintentos agotados'}</p>
            <p className="whitespace-pre-wrap break-words">{message.success ? message.data.body ?? 'Adjunto: revisar en WhatsApp' : 'Formato pendiente de revisión'}</p>
            <InboxControls id={item.id} recent={item.recent} />
          </article>;
        })}
      </section>}
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2" aria-label="Conversaciones recientes">
          <p className="text-sm text-sp-admin-muted">Últimas 100 conversaciones · <Link href="/admin/captacion" className="underline">Actualizar</Link></p>
          {!conversations.length && <p className="p-4 text-sm">Todavía no hay conversaciones.</p>}
          {conversations.map((conversation) => <Link key={conversation.id} href={`/admin/captacion?id=${conversation.id}`}
            aria-current={conversation.id === selectedId ? 'page' : undefined}
            className={`block rounded-xl border p-4 ${conversation.id === selectedId ? 'border-sp-orange' : 'border-sp-admin-border'} bg-sp-admin-card`}>
            <p className="font-semibold">{conversation.profile.name ?? 'Nuevo creador'}</p>
            <p className="text-xs text-sp-admin-muted">{STATES[conversation.state]} · {conversation.channel}</p>
            <p className="mt-2 text-sm">{QUALIFICATION_LABELS[conversation.qualification] ?? 'Pendiente'}</p>
          </Link>)}
        </aside>
        <div className="min-w-0 space-y-5">
          {detail ? <>
            <div className="space-y-3">
              <p>{STATES[detail.conversation.state]}{detail.conversation.reason ? ` · ${REASONS[detail.conversation.reason] ?? 'Revisar conversación'}` : ''}</p>
              <IntakeControls id={detail.conversation.id} version={detail.conversation.version} closed={detail.conversation.state === 'closed'} />
            </div>
            <IntakeProfileCard profile={detail.conversation.profile} />
            <section className="space-y-3 rounded-xl border border-sp-admin-border p-5" aria-label="Historial">
              <h2 className="font-display text-xl font-bold uppercase">Conversación</h2>
              {detail.messages.map((message) => <article key={message.id} className="space-y-2 border-b border-sp-admin-border pb-3">
                <p className="text-xs text-sp-admin-muted">{message.actor === 'owner' ? 'Tú, desde tu cuenta' : message.actor === 'system' ? 'Control de conversación' : 'Creador'} · {message.occurredAt.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
                <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                {message.actor === 'creator' && !detail.outbox.some((item) => item.messageId === message.id && item.kind === 'reply' && item.status === 'accepted')
                  && !detail.messages.some((later) => later.actor === 'owner' && later.occurredAt > message.occurredAt)
                  && <p className="text-xs text-sp-orange">Sin respuesta confirmada para esta entrada. {detail.conversation.state === 'human' || detail.conversation.state === 'waiting_human' ? 'Pendiente de atención personal.' : 'Revisar el historial antes de continuar.'}</p>}
                {detail.outbox.filter((item) => item.messageId === message.id).map((item) => <div key={item.id} className="rounded-lg bg-sp-admin-card p-3 text-sm">
                  <p className="mb-1 text-xs text-sp-admin-muted">{item.kind === 'reply' ? 'Asistente' : 'Aviso privado'} · {DELIVERY[item.status]}</p>
                  <p className="whitespace-pre-wrap break-words">{item.text}</p>
                </div>)}
              </article>)}
            </section>
          </> : <IntakeProfileCard profile={{}} />}
        </div>
      </div>
    </div>
  );
}
