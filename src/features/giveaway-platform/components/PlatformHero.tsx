interface Props {
  code: string;
  creatorName: string;
}

/**
 * Hero centrado de /sorteos/plataforma. Copy premium "GIVEAWAYS de {creador}"
 * en gradiente SocialPro + subtítulo con código. Sin motion box — quitado
 * a petición del usuario.
 */
export function PlatformHero({ code, creatorName }: Props) {
  return (
    <header className="gp-hero" id="home">
      <div className="gp-hero-copy">
        <h1>
          Giveaways
          <span className="gp-hero-creator">de {creatorName}</span>
        </h1>
        <div className="gp-hero-sub">
          <div className="line l" aria-hidden />
          <p>
            ¡Usa el código <b>{code}</b> para recibir las mejores ofertas!
          </p>
          <div className="line r" aria-hidden />
        </div>
      </div>
    </header>
  );
}
