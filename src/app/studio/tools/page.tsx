import { requireCreator } from '@/lib/studio/access';
import { env } from '@/lib/env';
import { StudioShell } from '@/features/studio/StudioShell';
export default async function ToolsPage() {
  const { member, repository } = await requireCreator();
  const profile = await repository.profile();
  const tools = [
    { name: 'Identidad y biblioteca', status: profile ? 'Material privado disponible' : 'Sin perfil editorial', text: 'Retrato, voz original, logo y referencias con permisos. Guardar un retrato no equivale a entrenar un avatar.' },
    { name: 'Asistente editorial', status: 'Disponible · sin créditos', text: 'Ayudas de estructura, ritmo, CTA y revisión. Historial persistente y aplicación explícita a una nueva versión.' },
    { name: 'Chat IA', status: env.AI_GATEWAY_API_KEY ? 'Proveedor configurado' : 'Credencial pendiente', text: `AI SDK + Gateway. Modelo configurado: ${env.STUDIO_AI_MODEL}. No puede gastar créditos de vídeo ni publicar.` },
    { name: 'Montaje y FFmpeg', status: env.STUDIO_RENDER_ENABLED ? 'Cola habilitada' : 'Trabajador pendiente', text: 'Escenas, recortes temporales, cartelas y exportaciones 9:16, 1:1 y 16:9. Comprueba la finalización de cada trabajo en Revisión.' },
    { name: 'Higgsfield · voz', status: env.STUDIO_HIGGSFIELD_ENABLED && profile?.higgsfieldVoice ? 'Voz vinculada · coste bajo aprobación' : 'Trabajador o voz pendientes', text: 'Solicita el coste desde Brief y guion. La agencia autoriza una narración con la versión e importe vistos. Sin reintentos de pago automáticos. La sincronía labial/avatar aún no está integrada.' },
    { name: 'HyperFrames', status: 'Integrado · diseños SocialPro v1', text: 'Anima cartelas con diseños propios y versionados. El trabajador renderiza HTML local y FFmpeg monta el MP4. No regenera rostros ni consume créditos de Higgsfield. Requiere Chrome y FFmpeg en el servidor.' },
    { name: 'Whisper', status: 'No conectado a este editor', text: 'Pendiente de integrar la transcripción en el trabajador. Los subtítulos no se añaden automáticamente.' },
    { name: 'Métricas sociales', status: env.YOUTUBE_API_KEY ? 'YouTube público configurado' : 'APIs pendientes', text: 'Perfiles indicados separados de métricas verificadas. Instagram y TikTok necesitan integración OAuth oficial antes de importar insights.' },
    { name: 'Almacenamiento', status: env.STORAGE_DRIVER === 'local' ? 'Privado · disco del servidor' : 'Privado · Vercel Blob', text: 'Acceso autenticado, comprobación de pertenencia y versiones nuevas. Ni los audios ni el retrato se publican por tener un enlace.' },
    { name: 'Publicación', status: 'Manual · revisión humana', text: 'Calendario editorial y descarga. No hay publicación automática ni autorización implícita para usar música o clips de terceros.' },
  ];
  return <StudioShell name={member.name} active="/studio/tools"><p className="studio-eyebrow">TRANSPARENCIA / STACK / COSTES</p><h1 className="studio-page-title">Qué mueve tu Studio.</h1><p className="studio-lead">Estado de este entorno, sin confundir un componente instalado con un servicio conectado y probado.</p><div className="studio-runtime-grid">{tools.map((tool) => <article className="studio-runtime-card" key={tool.name}><span className="studio-badge">{tool.status}</span><h2>{tool.name}</h2><p>{tool.text}</p></article>)}</div></StudioShell>;
}
