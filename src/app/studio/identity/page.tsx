import { requireCreator } from '@/lib/studio/access';
import { StudioShell } from '@/features/studio/StudioShell';
import { StudioMedia } from '@/features/studio/StudioMedia';

export default async function IdentityPage() {
  const { member, repository } = await requireCreator();
  const [profile, assets] = await Promise.all([
    repository.profile(),
    repository.assets(),
  ]);
  return (
    <StudioShell name={member.name} active="/studio/identity">
      <p className="studio-eyebrow">IDENTIDAD / ACCESO PRIVADO</p>
      <h1 className="studio-page-title">Siempre tú.</h1>
      {!profile ? (
        <div className="studio-empty">
          <p>
            Tu ficha de identidad aún no se ha registrado. No tienes acceso al
            retrato ni a la voz de otros creadores.
          </p>
        </div>
      ) : (
        <>
          <p className="studio-lead">
            {profile.displayName} · {profile.role}
          </p>
          <div className="studio-identity-grid">
            <section className="studio-panel">
              <h2>Contexto aprobado para trabajar</h2>
              <p>{profile.bio}</p>
              <h3>Voz y pronunciación</h3>
              <p>{profile.pronunciation}</p>
              <p className="studio-review-note">
                {profile.voiceStatus === 'approved_external'
                  ? 'Voz aprobada en la producción externa. El clon de Higgsfield aún no está conectado para generar desde Studio.'
                  : 'Audio de referencia. No hay un clon conectado.'}
              </p>
              <h3>Permiso de uso</h3>
              <p>{profile.usageScope}</p>
              <h3>Controles de calidad</h3>
              <ul>
                {profile.guidelines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <div className="studio-identity-media">
              {[
                profile.portraitAssetId,
                profile.voiceAssetId,
                profile.logoAssetId,
              ]
                .flatMap((id) => {
                  const asset = assets.find((item) => item.id === id);
                  return asset ? [asset] : [];
                })
                .map((asset) => (
                  <StudioMedia key={asset.id} asset={asset} />
                ))}
            </div>
          </div>
          <section className="studio-panel">
            <p className="studio-eyebrow">
              INFORMACIÓN FACILITADA POR EL FUNDADOR
            </p>
            <h2>Las personas, en su sitio.</h2>
            <div className="studio-team-list">
              {profile.team.map((person) => (
                <article key={person.name}>
                  <h3>{person.name}</h3>
                  <p>{person.role}</p>
                </article>
              ))}
            </div>
            <h3>Creadores que trabajan con nosotros</h3>
            <p>{profile.currentCreators.join(' · ')}</p>
            <h3>Han colaborado con SocialPro</h3>
            <p>{profile.collaborators.join(' · ')}</p>
            <p>
              Contexto de esta pieza, no un listado contractual actualizado
              automáticamente.
            </p>
          </section>
          <section className="studio-panel">
            <h2>Antes de publicar</h2>
            <p className="studio-history">{profile.publicationNotes}</p>
            <h3>Procedencia</h3>
            <ul>
              {profile.sources.map((source) => (
                <li key={source.label}>
                  {source.label} · {source.date}
                  {source.url && (
                    <>
                      {' '}
                      ·{' '}
                      <a href={source.url} target="_blank" rel="noreferrer">
                        Ver fuente ↗
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </StudioShell>
  );
}
