'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, RefreshCw } from 'lucide-react';
import { declareStudioChannel, syncStudioYouTube } from '@/app/studio/channel-actions';
import type { StudioChannelInput } from '@/lib/schemas/studio-production';
export function StudioConnection({ platform, channel, youtubeReady }: {
  platform: StudioChannelInput['platform']; channel: { id: string; handle: string; url: string | null; syncedAt: string | null } | null; youtubeReady: boolean;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(channel?.handle ?? '');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  return <article className="studio-connection"><span className="studio-icon-tile"><Globe size={24} /></span><span className="studio-badge">{channel?.syncedAt ? 'Datos públicos verificados' : channel ? 'Perfil indicado' : 'Sin perfil'}</span>
    <h2>{platform === 'x' ? 'X' : platform === 'youtube' ? 'YouTube' : platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'Twitch'}</h2>
    <form onSubmit={(e) => { e.preventDefault(); startTransition(async () => {
      try { const result = await declareStudioChannel({ platform, handle }); setMessage(result.ok ? 'Perfil guardado. Esto no concede acceso a tu cuenta.' : result.error); router.refresh(); }
      catch { setMessage('No se pudo guardar.'); }
    }); }}><label className="sr-only" htmlFor={`handle-${platform}`}>Usuario de {platform}</label><input id={`handle-${platform}`} value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={51} placeholder="@tuusuario" autoComplete="off" /><button className="studio-btn secondary" disabled={pending || handle.length < 2}>Guardar</button></form>
    {channel?.url && <a href={channel.url} target="_blank" rel="noreferrer">@{channel.handle} ↗</a>}
    <p>{platform === 'youtube' ? 'La API pública verifica el canal y sus contadores acumulados. No concede acceso a retención, ingresos ni estadísticas privadas.' : 'El usuario identifica tu perfil, pero las estadísticas privadas necesitan conexión oficial y permisos de lectura. Nunca pedimos tu contraseña.'}</p>
    {platform === 'youtube' && channel && <button disabled={!youtubeReady || pending} className="studio-btn secondary" onClick={() => startTransition(async () => {
      try { const result = await syncStudioYouTube(channel.id); setMessage(result.ok ? 'Datos públicos sincronizados.' : result.error); router.refresh(); } catch { setMessage('No se pudo sincronizar.'); }
    })}><RefreshCw size={14} />{youtubeReady ? 'Sincronizar canal' : 'API pendiente de configurar'}</button>}
    {platform !== 'youtube' && <small>OAuth de {platform} pendiente de habilitación en la app.</small>}
    {channel?.syncedAt && <p>Consulta: {new Date(channel.syncedAt).toLocaleString('es-ES')}</p>}
    <p role="status">{pending ? 'Guardando…' : message}</p>
  </article>;
}
