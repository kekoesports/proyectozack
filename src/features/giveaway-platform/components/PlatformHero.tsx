interface Props {
  code: string;
}

export function PlatformHero({ code }: Props) {
  return (
    <header className="gp-hero" id="home">
      <h1>Bonuses</h1>
      <div className="gp-hero-sub">
        <div className="line l" aria-hidden />
        <p>
          ¡Usa el código <b>{code}</b> para recibir las mejores ofertas!
        </p>
        <div className="line r" aria-hidden />
      </div>
    </header>
  );
}
