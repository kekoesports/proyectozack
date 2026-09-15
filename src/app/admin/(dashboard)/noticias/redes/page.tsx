import Link from 'next/link';
import { requireRole } from '@/lib/auth-guard';
import { env } from '@/lib/env';
import { getSocialOverview } from '@/lib/news-social/repository';
import { hasPublishingCredentials } from '@/lib/news-social/providers';
import { budgetMonth, X_MONTHLY_BUDGET_CENTS } from '@/lib/news-social/policy';
import { controlNewsSocialAction } from './actions';

const statusLabels = {
  pending: 'Pendiente', processing: 'Preparando', publishing: 'Enviando', published: 'Publicada',
  blocked: 'Requiere atención', uncertain: 'Comprobar en la red antes de reenviar', cancelled: 'No se enviará',
};
const errorLabels: Record<string, string> = {
  credentials_missing: 'Falta conectar la cuenta con permiso de publicación.',
  credentials_changed: 'La conexión ha cambiado. Verifica la cuenta de nuevo.',
  service_disabled: 'El servicio de publicación está pausado en el servidor.',
  account_mismatch: 'La conexión no corresponde a la cuenta de SocialPro.',
  monthly_budget_reached: 'Se ha alcanzado el límite mensual de X.',
  provider_http_401: 'La conexión ha caducado. Hay que renovarla.',
  provider_http_403: 'La cuenta no tiene permiso para publicar mediante esta conexión.',
  provider_http_402: 'X no tiene saldo disponible.',
  provider_http_429: 'La red ha pedido esperar antes de reintentar.',
  article_no_longer_eligible: 'La noticia ya no es pública, es anterior a la activación o tiene más de 48 horas.',
};

export default async function NewsSocialPage() {
  await requireRole('admin', '/admin/login');
  const { channels, deliveries } = await getSocialOverview();
  return <div className="space-y-6">
    <Link href="/admin/noticias" className="text-sp-orange">← Noticias</Link>
    <h1 className="font-display text-4xl font-black uppercase">Difusión en redes</h1>
    <p className="text-sp-admin-muted max-w-3xl">Cada noticia nueva de la web se comparte una vez en X y como historia de Instagram. Las noticias programadas esperan a su fecha. Las propuestas para prensa, el blog y los boletines siguen sus propios recorridos.</p>
    {!env.NEWS_SOCIAL_ENABLED && <p className="rounded-lg border border-amber-500/40 p-4">Preparado, pendiente de habilitar las conexiones en el servidor.</p>}
    <div className="grid gap-4 md:grid-cols-2">
      {(['x', 'instagram'] as const).map(channel => {
        const config = channels.find(item => item.channel === channel);
        const connected = hasPublishingCredentials(channel);
        const reserved = config?.budgetMonth === budgetMonth(new Date()) ? config.reservedCents : 0;
        return <section key={channel} className="rounded-xl border border-sp-admin-border p-5 space-y-3">
          <h2 className="text-xl font-bold">{channel === 'x' ? 'X · @SocialProES' : 'Instagram · @socialproes'}</h2>
          <p>{config?.enabled && env.NEWS_SOCIAL_ENABLED ? 'Activada' : connected ? 'Pausada' : 'Pendiente de conexión'}</p>
          <p className="text-sm text-sp-admin-muted">{channel === 'x'
            ? `Reserva de publicación este mes: ${(reserved / 100).toFixed(2)} / ${(X_MONTHLY_BUDGET_CENTS / 100).toFixed(2)} USD. Máximo 20 intentos con enlace; comprobaciones de conexión aparte.`
            : 'Historia vertical con plantilla SocialPro, sin coste de generación. El enlace que aparece en la imagen no es clicable.'}</p>
          {config?.lastError && <p role="status" className="text-amber-400">{errorLabels[config.lastError] ?? 'Hay una incidencia. Revisa la conexión antes de continuar.'}</p>}
          {config?.lastRunAt && <p className="text-sm text-sp-admin-muted">Última comprobación: {config.lastRunAt.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>}
          <form action={controlNewsSocialAction}>
            <input type="hidden" name="channel" value={channel} />
            <input type="hidden" name="action" value={config?.enabled ? 'pause' : 'activate'} />
            <button disabled={!config?.enabled && (!connected || !env.NEWS_SOCIAL_ENABLED)} className="rounded-lg bg-sp-orange px-4 py-2 font-semibold text-white disabled:opacity-40">
              {config?.enabled ? 'Pausar' : 'Verificar cuenta y activar'}
            </button>
          </form>
        </section>;
      })}
    </div>
    <p className="text-sm text-sp-admin-muted">La primera activación empieza con noticias nuevas. Los fallos se reintentan de forma limitada; si la red no confirma si publicó, el envío queda retenido para evitar duplicados. Pausar impide nuevos envíos, pero uno ya enviado a la red puede terminar.</p>
    <h2 className="text-xl font-bold">Últimos envíos</h2>
    {!deliveries.length ? <p className="text-sp-admin-muted">Todavía no hay envíos. Puedes previsualizar la historia desde una noticia publicada.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr><th className="p-3">Noticia</th><th className="p-3">Red</th><th className="p-3">Estado</th><th className="p-3">Resultado</th></tr></thead>
      <tbody>{deliveries.map(({ delivery, title }) => <tr key={delivery.id} className="border-t border-sp-admin-border">
        <td className="p-3"><Link href={delivery.articleUrl}>{title ?? 'Noticia retirada'}</Link></td>
        <td className="p-3">{delivery.channel === 'x' ? 'X' : 'Instagram'}</td>
        <td className="p-3">{statusLabels[delivery.status]}{delivery.lastError && <p className="text-sp-admin-muted">{errorLabels[delivery.lastError] ?? 'Consulta necesaria antes de continuar.'}</p>}</td>
        <td className="p-3">{delivery.channel === 'x' && delivery.remoteId
          ? <a href={`https://x.com/SocialProES/status/${delivery.remoteId}`} target="_blank" rel="noreferrer">Ver tweet ↗</a>
          : delivery.postId && <a href={`/api/news/${delivery.postId}/story`} target="_blank" rel="noreferrer">Ver historia ↗</a>}</td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}
