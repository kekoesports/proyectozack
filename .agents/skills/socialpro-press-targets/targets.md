# SocialPro — Targets de prensa y noticias

Lista mantenida por la skill `socialpro-press-targets`. Editable a mano para promover, rechazar o anotar entradas. La skill **nunca borra filas** — solo añade o actualiza.

**Convenciones:**
- Schema curados: `Nombre | URL | Región | Submission | Notas | Validado`
- Schema pendientes: igual + `Categoría | Descubierto`
- Schema rechazados: `Dominio | Razón | Fecha`
- Submission: `email@x.com` / `form: <url>` / `dm: @handle` / `?` (verificar manual)
- Región: ES, MX, AR, CL, CO, PE, UY, EC, VE, PY, BO, ES/LATAM
- Validado: fecha ISO `YYYY-MM-DD` de la última verificación con Firecrawl

---

## Curados — Gaming Generalista

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|
| 3DJuegos | https://www.3djuegos.com | ES | prensa@3djuegos.com | Medio especializado en videojuegos: noticias, análisis, contenido | 2026-05-02 |
| Vandal | https://vandal.elespanol.com | ES | noticias@vandal.net | 2ª web videojuegos más antigua en español, foco consolas y PC | 2026-05-02 |
| MERISTATION | https://as.com/meristation | ES | atencionclientes@diarioas.es | Fundada 1997, info entretenimiento; email genérico Diario AS | 2026-05-02 |
| 3DJuegos PC | https://www.3djuegospc.com | ES | prensa@3djuegospc.com | Spin-off de 3DJuegos centrado en PC gaming | 2026-05-02 |

## Curados — CS2 / FPS Hispano

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|
| Movistar eSports | https://www.movistaresports.com | ES | ? | [verificar contacto manualmente] Vertical esports de Movistar+ | 2026-05-02 |

## Curados — iGaming / Skins / Gambling

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|
| InfoPlay | https://www.infoplay.info | CL | dm: @_infoplay | Medio iGaming en español con cobertura LATAM y Chile (regulación) | 2026-05-02 |
| G&M News (Gaming And Media) | https://g-mnews.com | ES/LATAM | ? | [verificar contacto manualmente] Medio iGaming/gambling LATAM en español | 2026-05-02 |
| Gaming Intelligence (ES) | https://www.gamingintelligence.com/es | ES/LATAM | ? | [verificar contacto manualmente] Versión ES del medio iGaming global Gaming Intelligence | 2026-05-02 |

## Curados — Prensa Digital Local

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|
| El Norte (AR) | https://www.diarioelnorte.com.ar | AR | redaccion@diarioelnorte.com.ar | Periódico digital de Corrientes (AR), cubre noticias generales | 2026-05-02 |
| La Tercera | https://www.latercera.com | CL | ? | [verificar contacto manualmente] Diario CL; cubre regulación iGaming y tecnología | 2026-05-02 |
| iProUP | https://www.iproup.com | AR | ? | [verificar contacto manualmente] Medio AR economía digital, cripto, finanzas, iGaming | 2026-05-02 |
| Diario El Independiente (BCS) | https://www.diarioelindependiente.mx | MX | ? | [verificar contacto manualmente] Periódico La Paz, BCS; tiene sección deportes/tec con cobertura esports | 2026-05-02 |
| Olé | https://www.ole.com.ar | AR | ? | [verificar contacto manualmente] Diario deportivo AR con sección esports activa (Mundial Arabia) | 2026-05-02 |
| El Independiente MX | https://elindependiente.mx | MX | redaccion@elindependiente.mx | Medio digital MX con cobertura esports/tecnología (también contacto@elindependiente.mx) | 2026-05-02 |

## Curados — Foros y Comunidades

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|
| Mediavida | https://www.mediavida.com | ES | publicidad@mediavida.com | Foro español de videojuegos, comunidad activa | 2026-05-02 |
| Forocoches | https://www.forocoches.com | ES | ? | [verificar contacto manualmente] Foro generalista ES con subforo gaming | 2026-05-02 |

## Curados — Periodistas Individuales

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|

---

## Pendientes de revisión

Cola de candidatos descubiertos por la skill. Promueve moviendo la fila a la sección `## Curados — <categoría>` correspondiente (con sus 6 columnas estándar). Rechaza moviendo el dominio raíz a `## Rechazados`.

| Nombre | URL | Región | Submission | Notas | Categoría | Descubierto |
|---|---|---|---|---|---|---|

---

## Rechazados

Dominios marcados como no relevantes. La skill los excluye en futuros runs de discovery.

| Dominio | Razón | Fecha |
|---|---|---|
| aevi.org.es | categoria-otro (asociación, no medio) | 2026-05-02 |
| madridingame.es | categoria-otro (cluster empresarial, no medio) | 2026-05-02 |
| ifema.es | categoria-otro (evento, no medio editorial) | 2026-05-02 |
| webedia-group.com | categoria-otro (holding empresarial, ir a filiales) | 2026-05-02 |
| counter-strike.net | sitio oficial del juego, no medio | 2026-05-02 |
| esportsawards.com | sitio inglés, fuera de scope ES/LATAM | 2026-05-02 |
| esportsinsider.com | sitio inglés, fuera de scope ES/LATAM | 2026-05-02 |
| frontiersin.org | journal académico inglés, fuera de scope | 2026-05-02 |
| youtube.com | plataforma, no medio | 2026-05-02 |
| infobae.com | falso positivo: name "apuestas-deportivas.es" inconsistente con dominio | 2026-05-02 |
| eleconomista.com.mx | falso positivo: name "Casino.org España" embedded en artículo | 2026-05-02 |
| lanacion.com.ar | falso positivo: "Content LAB" branded content, no editorial | 2026-05-02 |
| redhistoria.com | falso positivo: medio de historia, no iGaming | 2026-05-02 |
| apple.com | plataforma (Apple Podcasts), no medio editorial | 2026-05-02 |
| ivoox.com | plataforma de podcasts, no medio editorial | 2026-05-02 |
