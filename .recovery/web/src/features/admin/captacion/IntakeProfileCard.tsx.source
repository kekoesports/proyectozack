import type { IntakeProfile } from '@/lib/schemas/creatorIntake';
import { GAMBLING_PREFERENCE_LABELS } from '@/lib/intake/qualification';

export function IntakeProfileCard({ profile }: { profile: IntakeProfile }): React.ReactElement {
  const average = profile.averageViewers;
  const tiktok = profile.tiktokAverageViewers;
  const preferences = profile.gamblingPreferences;
  const preference = (value: 'yes' | 'no' | 'discuss' | undefined) => value ? GAMBLING_PREFERENCE_LABELS[value] : 'Pendiente';
  const instagram = profile.instagramMetrics;
  return (
    <section className="space-y-3 rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
      <h2 className="font-display text-xl font-bold uppercase">Ficha del contacto</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-sp-admin-muted">Nombre</dt><dd>{profile.name ?? 'Pendiente'}</dd></div>
        <div><dt className="text-sp-admin-muted">Tipo de contacto</dt><dd>{profile.contactType === 'brand' ? 'Marca' : profile.contactType === 'creator' ? 'Creador' : 'Sin confirmar'}</dd></div>
        <div><dt className="text-sp-admin-muted">Interés en SocialPro</dt><dd>{profile.interested === undefined ? 'Sin confirmar' : profile.interested ? 'Sí' : 'No'}</dd></div>
        <div><dt className="text-sp-admin-muted">Colaboraciones con casinos</dt><dd>{preference(preferences?.casinos)}</dd></div>
        <div><dt className="text-sp-admin-muted">Casas de apuestas</dt><dd>{preference(preferences?.sportsBetting)}</dd></div>
        <div><dt className="text-sp-admin-muted">Gambling de CS2</dt><dd>{preference(preferences?.cs2Gambling)}</dd></div>
        <div><dt className="text-sp-admin-muted">País</dt><dd>{profile.country ?? 'Pendiente'}</dd></div>
        <div><dt className="text-sp-admin-muted">Mayoría de edad</dt><dd>{profile.adult === undefined ? 'Pendiente' : profile.adult ? 'Declarada' : 'Revisión personal'}</dd></div>
        <div><dt className="text-sp-admin-muted">Contacto adicional</dt><dd>{profile.email ?? 'Disponible en el chat de origen'}</dd></div>
        <div><dt className="text-sp-admin-muted">Media en directo</dt><dd>{average ? `${average.value} · ${profile.streamPlatform ?? 'plataforma pendiente'} · ${average.periodDays} días` : 'Sin dato'}</dd></div>
        <div><dt className="text-sp-admin-muted">Contenido CS2 / casino</dt><dd>{profile.focusPercent === undefined ? 'Sin dato' : `${profile.focusPercent}% · ${profile.focusPeriodDays ?? 'periodo pendiente'} días`}</dd></div>
        <div><dt className="text-sp-admin-muted">TikTok LIVE · media</dt><dd>{tiktok ? `${tiktok.value} personas · ${tiktok.periodDays} días` : 'Sin dato'}</dd></div>
        <div><dt className="text-sp-admin-muted">Batallas</dt><dd>{profile.tiktokBattles === undefined ? 'Pendiente' : profile.tiktokBattles ? 'Sí' : 'No'}</dd></div>
      </dl>
      {instagram && <p className="text-sm">Instagram: {instagram.followers ?? '—'} seguidores · {instagram.reach ?? '—'} de alcance · {instagram.averageReelViews ?? '—'} visualizaciones medias por reel · {instagram.periodDays ? `${instagram.periodDays} días` : 'periodo no indicado'}.</p>}
      <p className="text-sm">{profile.goal ?? 'Objetivo pendiente de conocer.'}</p>
      <ul className="space-y-1 text-sm">{profile.socials?.map((social) => <li key={`${social.platform}:${social.url}`}>
        <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-sp-blue underline break-all">{social.platform} · {social.url}</a>
        {social.followers !== undefined && <span> · {social.followers} seguidores declarados</span>}
      </li>)}</ul>
      <p className="text-xs text-sp-admin-muted">Métricas declaradas, pendientes de verificación. Cumplir los criterios no garantiza campañas ni ingresos.</p>
    </section>
  );
}
