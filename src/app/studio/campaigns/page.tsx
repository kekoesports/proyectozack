import { requireCreator } from "@/lib/studio/access";
import { StudioShell } from "@/features/studio/StudioShell";

export default async function CampaignReferencesPage() {
  const { member, repository, production } = await requireCreator();
  const campaigns = await production.campaigns();
  const profile = await repository.profile();
  return (
    <StudioShell name={member.name} active="/studio/campaigns">
      <p className="studio-eyebrow">CONTEXTO PARA CREAR</p>
      <h1 className="studio-page-title">Campañas y referencias.</h1>
      <p className="studio-lead">
        Casos públicos de la agencia autorizados para este espacio. No implican
        que hayas participado ni son tus resultados personales.
      </p>
      {profile?.cases.length ? (
        profile.cases.map((item) => (
          <article className="studio-panel" key={item.title}>
            <span className="studio-badge">
              Caso público / referencia editorial
            </span>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <p>
              Consulta: {item.source.date}. Sin importes privados ni métricas
              atribuidas a tu cuenta.
            </p>
            <a href={item.source.url} target="_blank" rel="noreferrer">
              Leer el caso en su fuente ↗
            </a>
          </article>
        ))
      ) : (
        <div className="studio-empty">
          No hay referencias compartidas contigo todavía.
        </div>
      )}
      <section className="studio-panel">
        <h2>Mis campañas realizadas</h2>
        {campaigns.length ? campaigns.map((campaign) => <article className="studio-row" key={campaign.id}><div><strong>{campaign.name}</strong><p>{campaign.actionType} · {campaign.startDate ?? 'Sin fecha'} — {campaign.endDate ?? 'Sin cierre'}</p></div><span className="studio-badge">{campaign.status}</span></article>) : <p>No hay campañas del CRM asignadas a tu identidad en este entorno. No se atribuyen casos públicos a tu historial.</p>}
        <p>
          Tus entregables disponibles aparecen en «Mi espacio». No compartimos
          márgenes, honorarios de otros creadores ni notas internas.
        </p>
      </section>
    </StudioShell>
  );
}
