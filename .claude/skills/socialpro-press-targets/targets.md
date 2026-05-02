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

## Curados — CS2 / FPS Hispano

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|

## Curados — iGaming / Skins / Gambling

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|

## Curados — Prensa Digital Local

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|

## Curados — Foros y Comunidades

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|

## Curados — Periodistas Individuales

| Nombre | URL | Región | Submission | Notas | Validado |
|---|---|---|---|---|---|

---

## Pendientes de revisión

Cola de candidatos descubiertos por la skill. Promueve moviendo la fila a la sección `## Curados — <categoría>` correspondiente (con sus 6 columnas estándar). Rechaza moviendo el dominio raíz a `## Rechazados`.

| Nombre | URL | Región | Submission | Notas | Categoría | Descubierto |
|---|---|---|---|---|---|---|
| 3DJuegos | https://www.3djuegos.com | ES | prensa@3djuegos.com | Medio especializado en videojuegos: noticias, análisis, contenido | gaming-generalista | 2026-05-02 [vandal/meristation/3djuegos] |
| Vandal | https://vandal.elespanol.com | ES | noticias@vandal.net | 2ª web videojuegos más antigua en español, foco consolas y PC | gaming-generalista | 2026-05-02 [vandal/meristation/3djuegos] |
| MERISTATION | https://as.com/meristation | ES | atencionclientes@diarioas.es | Fundada 1997, info entretenimiento: videojuegos, cine, anime | gaming-generalista | 2026-05-02 [vandal/meristation/3djuegos] |
| 3DJuegos PC | https://www.3djuegospc.com | ES | prensa@3djuegospc.com | Spin-off de 3DJuegos centrado en PC gaming | gaming-generalista | 2026-05-02 [vandal/meristation/3djuegos] |
| Movistar eSports | https://www.movistaresports.com | ES | ? | [verificar contacto manualmente] Vertical esports de Movistar+ | gaming-generalista | 2026-05-02 [movistar/as/marca esports CS2] |
| El Norte (AR) | https://www.diarioelnorte.com.ar | AR | redaccion@diarioelnorte.com.ar | Periódico digital de Corrientes (AR), cubre noticias generales | prensa-local | 2026-05-02 [casino online México OR Argentina] |
| Mediavida | https://www.mediavida.com | ES | publicidad@mediavida.com | Foro español de videojuegos, comunidad activa | foro | 2026-05-02 [mediavida/forocoches subforo] |
| Forocoches | https://www.forocoches.com | ES | ? | [verificar contacto manualmente] Foro generalista ES con subforo gaming | foro | 2026-05-02 [mediavida/forocoches subforo] |

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
