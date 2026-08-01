# Reglas editoriales para landings SEO (sprint SEO+GEO 2026-07 y posteriores)

Reglas permanentes que aplican a todas las landings del sitio, con énfasis en las verticales sensibles (iGaming, casino, sportsbook, poker, CS2 skins).

## 1. Nombramiento de creadores

**Ningún creador se nombra en una landing de gambling / skins / iGaming sin confirmación explícita de Keko** (Pablo Camacho, CEO). Aplica a:

- Copy visible de la landing.
- Bloques de casos, testimonios, resultados.
- JSON-LD (`Person`, `mention`, `subjectOf`).
- Meta `openGraph:description` o `twitter:description` si nombra a alguien.

**Cada mención debe usar el encuadre correcto:**

| Encuadre | Cuándo aplica | Ejemplo |
|---|---|---|
| **Roster** | Talento representado por SocialPro con relación formal vigente. | "Naow, del roster de SocialPro" |
| **Cofundador / fundador** | Miembros fundadores del equipo que además crean contenido. | "Zacketizor (Alfonso 'Zack' Arias, cofundador de SocialPro que sigue activo como streamer)" |
| **Colaboración puntual** | Creador con activaciones pasadas con SocialPro sin relación de roster. | "colaboraciones puntuales como la de Imantado" |
| **Cliente** | Marca/operador (nunca persona) que trabajó con la agencia. | "1WIN", "SkinsMonkey", "KeyDrop" |

**Nunca decir "del roster" a alguien que no lo es.** Es el error concreto que motivó esta regla (auditoría post-Fase 2, 2026-07-30).

## 2. Claims regulatorios

Toda afirmación sobre normativa (DGOJ, RD 958/2020, Coljuegos, SEGOB, etc.) debe:

1. **Anclarse temporalmente**: "Según el marco regulatorio vigente en España a 2026, …". Motivo: la regulación de juego es viva, cambia. Sin ancla temporal el claim envejece mal.
2. **Reconocer variación por jurisdicción**: cuando el claim aplique a un país específico, mencionarlo. Cuando la vertical tenga tratamientos distintos por país (marketplaces P2P, case opening, skin gambling), decir explícitamente "el tratamiento varía por país y por tipo de plataforma".
3. **Nunca convertirse en asesoramiento legal**. La landing informa; el operador valida su marco con su asesor. Añadir "conviene validar el marco aplicable con cada operador antes de una activación" cuando el claim afirma que algo NO requiere licencia.

## 3. Cifras y métricas

- Solo cifras verificables desde una fuente auditable (panel del operador, plataforma del partner, dashboard oficial).
- Nunca estimaciones, aproximaciones o "más de X" salvo que el dato exacto sea confidencial y el operador confirme el rango.
- Fuente citada en el copy: "verificado desde el panel del operador", "auditado por Blogabet", etc.
- Datos bajo NDA se declaran como tales: "cifras agregadas bajo NDA de partners".

## 4. Copy general

- **Español neutro**, tono directo y comercial, sin hype. Nada de "revoluciona tu marca", "líderes del sector", "los mejores".
- Términos técnicos de la industria (case opening, provably fair, FTD, RTP, cash game, MTT) se pueden mantener en inglés — es jerga aceptada.
- Palabras funcionales SIEMPRE en español dentro de landings ES (`para`, `con`, `y`, nunca `for`/`with`/`and`).

## 5. Cross-linking

- Cada landing nueva enlaza a **≥ 2 páginas existentes**.
- Enlaces contextuales (dentro de párrafos), no solo footer/nav.
- Todas las landings quedan en el footer "Especialidades" (o su equivalente EN).

## 6. Schemas obligatorios

Cada landing SEO emite (mínimo):

- `Service` con `serviceType`, `provider`, `areaServed`, `description`, `inLanguage`.
- `BreadcrumbList`.
- `FAQPage` si tiene bloque FAQ visible (5-6 Q/A mínimo).

Reglas de nombramiento del §1 también aplican dentro de los schemas.

## Historial de la regla

- **2026-07-30**: creación del documento tras auditoría de `/marketing-skins-cs2`. Motivo: se atribuyó "roster" a Imantado (colaboración puntual) y a Zacketizor (cofundador de la agencia, no talento en roster). Se estableció como regla permanente del sprint SEO+GEO y posteriores.
