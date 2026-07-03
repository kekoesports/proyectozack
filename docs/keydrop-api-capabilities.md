# Capacidades de la KeyDrop Giveaway API en perfiles SocialPro

**Estado:** decisión de diseño — 2026-07-03
**Ámbito:** Integración KeyDrop en `/sorteos/[creatorSlug]`
**Docs relacionados:**
- `docs/keydrop-single-giveaway-endpoint.md` (diagnóstico del endpoint singular)
- `docs/external-giveaways-provider-onboarding.md` (checklist de onboarding de partners)
- `src/lib/external-giveaways/providers/keydrop/zod-schemas.ts` (shapes reales)

---

## TL;DR

- La API pública del programa afiliado KeyDrop (`GET /api/list`) devuelve
  metadatos suficientes para pintar sorteos, premios, requisitos, código
  promocional, participantes totales y ganadores confirmados.
- **NO** devuelve lista de participantes por usuario, depósitos por usuario,
  ni identidad de los que participan (solo `participantCount: number` y
  `winners[]` después de finalizar).
- Por tanto: **prohibido** implementar ranking de participantes, monedas
  por participación externa, top depositantes, misiones auto-completadas
  vía KeyDrop, o cualquier feature que requiera identificar usuarios que
  participan/depositan sin verificación del partner.

---

## Datos que SÍ podemos leer

Endpoint autenticado: `GET https://ws-2071.socket-cs.com/v1/giveaway-user/api/list`
(header `x-api-key`, key por afiliado — hoy solo `KEYDROP_ZACKETIZOR_API_KEY`
en Vercel Production).

Shape verificada por probe real y por
`src/lib/external-giveaways/providers/keydrop/zod-schemas.ts`:

```txt
data.active[]
data.finished[]
  ├─ id                                 string
  ├─ status                             'new' | 'started' | 'ended'
  ├─ createdAt                          number (unix)
  ├─ deadlineTimestamp                  number | null
  ├─ duractionSeconds                   number (sic — typo upstream)
  ├─ minUsers, maxUsers                 number
  ├─ participantCount                   number (agregado; NO lista)
  ├─ depositAmountRequired              number
  ├─ depositAmountRequiredCurrency      string
  ├─ totalPrizes                        number
  ├─ prizes[]
  │    ├─ itemImg                       URL cdnkd.com
  │    ├─ title, subtitle
  │    ├─ price, currency
  │    └─ weaponType, condition, color, phase
  ├─ organizer
  │    ├─ idSteam, username, steamAvatar
  │    └─ promocode                     código propio del creador
  ├─ requirements                       record<string, {type, promoCode?, refillAmount?, fullfilled?}>
  ├─ chance, hot, boost                 flags/metadata secundaria
  └─ winners[]                          solo en finished — {idSteam, username, steamAvatar, prizeId}
```

Todo esto se puede consultar sin fricción, es información pública del
programa afiliado y no requiere consentimiento adicional del usuario.

---

## Qué mostramos hoy y qué podemos añadir

### Ya expuesto en `/sorteos/[creatorSlug]`

Vía `ExternalGiveawaysSection` + `ExternalGiveawayCard`:

- Sorteos activos y finalizados por creador.
- Imagen del premio (`prizes[0].itemImg`).
- Título / subtítulo del premio.
- Participantes totales por sorteo (`participantCount`).
- Deadline / countdown por sorteo.
- CTA deep link con código promocional aplicado.
- Placeholder honesto de ranking (`ProviderRankingPlaceholder`).

### Podemos añadir sin riesgo (mismos datos, más pantalla)

1. **Sorteos activos** — ya está.
2. **Premios destacados** — ranking interno por `prizes[].price`.
3. **Participantes totales por sorteo** — ya está.
4. **Valor total de premios activos** — suma de `prizes[].price` de todos
   los sorteos con `status !== 'ended'`.
5. **Requisito para participar** — pintar `requirements[*].type` y
   `refillAmount` como badges.
6. **Código promocional** — ya está (`organizer.promocode`).
7. **Sorteos finalizados** — ya está.
8. **Últimos ganadores** — nombres + avatares de `finished[*].winners[]`.
9. **Estadísticas agregadas del creador** — derivadas del array completo:
   - sorteos activos / finalizados
   - valor total en premios (activos y/o históricos)
   - participantes acumulados (suma de `participantCount`)
   - ganadores históricos (suma de `winners.length`)
   - premio más caro (`max(prizes[].price)`)
   - sorteo con más participantes (`max(participantCount)`)

Todas las métricas anteriores son sumatorios sobre datos que ya nos
devuelve la API — **no** implican identificar a ningún usuario final.

---

## Qué NO se debe implementar todavía

| Feature                              | Motivo                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Top participantes KeyDrop            | No tenemos `participants[]` — `participantCount` es un contador ciego. |
| Top depositantes                     | La API no expone monto depositado por usuario.                         |
| Usuarios repetidos entre sorteos     | Requiere lista de usuarios, no disponible.                             |
| Ranking por depósitos                | Ídem — sin datos por usuario, no hay ranking.                          |
| Ranking por participación externa    | Sin identidad verificable, cualquier ranking sería inventado.          |
| Monedas por participar en KeyDrop    | No podemos verificar que el usuario X haya participado.                |
| Monedas por depositar en KeyDrop     | No podemos verificar depósitos por usuario.                            |
| Misiones auto-completadas vía KeyDrop| Ídem — no hay señal de completado del usuario en cuestión.            |

**Motivo raíz:**

- `GET /api/list` devuelve `participantCount: number`, no lista.
- El probe del endpoint singular `GET /api/giveaway/:id` (ver
  `docs/keydrop-single-giveaway-endpoint.md`) devolvió `participants: []`
  en el request de prueba — no hay evidencia de que exponga lista.
- Sin lista verificable de participantes ni depósitos por usuario, no hay
  forma honesta de premiar, rankear ni contabilizar usuarios en base a
  KeyDrop.

Prohibiciones concretas:

- **No** crear tabla ni columnas para "participantes KeyDrop".
- **No** dar monedas SocialPro a usuarios que declaren haber participado
  en KeyDrop.
- **No** llenar el ranking de creador con datos derivados de
  `participantCount` disfrazados de identidades (sería inventar).
- **No** guardar registros que impliquen datos personales de usuarios
  KeyDrop que no hayan pasado por nuestro flujo de auth.

---

## Placeholder correcto para el bloque de ranking

Componente actual: `ProviderRankingPlaceholder.tsx`.

Copy honesto obligatorio:

> **Ranking KeyDrop próximamente**
>
> Actualmente mostramos sorteos, premios, participantes totales y ganadores
> confirmados por KeyDrop. El ranking por participación externa se activará
> únicamente cuando podamos verificar participantes reales mediante la API
> del partner.

No usar variantes que impliquen que ya tenemos "casi listo" ni sugerir
fechas concretas.

---

## Qué haría falta para desbloquear rankings / monedas externas

Solo se podrán implementar cuando se cumpla **al menos una** de estas
condiciones (documentadas y confirmadas por escrito con el partner):

1. **KeyDrop expone lista de participantes por sorteo** con `idSteam`,
   `username`, `steamAvatar` y (deseable) timestamp de participación.
   Requiere:
   - Confirmación oficial del equipo KeyDrop de que el campo existe.
   - Actualización del schema Zod (`KeydropListItemSchema.participants`).
   - Regla clara de opt-in/consent del usuario final si aplica GDPR.

2. **KeyDrop expone webhook de participación** que envía a nuestro
   backend eventos `{ giveawayId, idSteam, depositAmount, timestamp }`.
   Requiere:
   - Endpoint HTTPS firmado con secret compartido.
   - Verificación de firma en cada evento.
   - Idempotencia por `(giveawayId, idSteam)`.

3. **El usuario vincula su cuenta Steam** en SocialPro (ya lo tenemos
   con Better Auth Steam OpenID) **y** KeyDrop expone endpoint
   `GET /user/:idSteam/participations` que devuelve los sorteos en los
   que ha entrado ese Steam ID. Requiere lo mismo que (1) + join local
   sobre `user.steamId`.

Hasta que ninguna de esas 3 vías esté verificada y firmada, cualquier
implementación de ranking o monedas basada en KeyDrop es especulación y
queda **fuera del scope**.

---

## Reglas duras (no negociables)

- **Prohibido inventar datos de participación.** Si no viene de la API o
  de un webhook firmado, no existe.
- **Prohibido crear tablas nuevas para "participantes KeyDrop"** mientras
  no exista fuente verificable.
- **Prohibido dar monedas SocialPro** en base a acciones externas no
  verificadas.
- **Prohibido pintar rankings con nombres reales** derivados de nada que
  no sea `winners[]` de un sorteo ya finalizado.
- Todos los agregados que sí mostremos deben citar la fuente en el UI:
  "según datos públicos del programa afiliado KeyDrop" o equivalente.

---

## Historial

- **2026-07-03** — Documento inicial. Cierra la discusión sobre qué se
  puede pintar de KeyDrop en perfiles SocialPro y bloquea todo intento
  de ranking/monedas mientras no haya lista de participantes verificable.
