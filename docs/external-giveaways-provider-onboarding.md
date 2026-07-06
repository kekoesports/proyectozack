# Onboarding de un nuevo provider externo de sorteos

**Ámbito:** `/sorteos/plataforma` — cada vez que un creador SocialPro cierra un
partnership con una plataforma externa (KeyDrop, y en el futuro otras) que
expone sorteos vía API, seguimos esta checklist antes de escribir código.

**Regla principal:** ningún provider entra en la UI hasta que los 6 datos
"reales" (§0) estén confirmados por el owner del acuerdo. No añadimos
providers "stub" ni bindings "de prueba" que aparezcan visibles en la
plataforma pública.

**Regla secundaria:** los providers externos NO escriben nunca a
`coin_transactions`, `giveaway_entries` ni `mission_claims`. La economía
interna de monedas 🪙 vive aparte de los sorteos externos.

---

## 0. Datos de confirmación previa (bloqueantes)

Antes de tocar código, el owner del deal (Pablo / SocialPro) debe pasar
por escrito, en el mismo canal donde arrancamos el PR:

- [ ] **Marca / plataforma real:** nombre exacto y URL pública oficial del
      provider. Ej.: `KeyDrop` · https://keydrop.com. Ni "una plataforma
      de skins", ni "algo tipo X".
- [ ] **Creador de SocialPro:** slug exacto tal como aparece en la tabla
      `talents` de la DB (ej.: `zacketizor`, `naow`, etc.). Si el
      creador es nuevo, hay que darlo de alta antes en `talents`.
- [ ] **Código promocional real del creador con el provider:** ej.
      `ZACKCSGO`. Ni un placeholder ni "cualquier código".
- [ ] **Docs de API del provider:** enlace a la documentación oficial o,
      si no existe, un dump de la conversación con el partner que
      describa endpoints, autenticación y shape.
- [ ] **Endpoint base real:** URL raíz de la API (ej.
      `https://ws-2071.socket-cs.com/v1/giveaway-user`).
- [ ] **Tipo de auth:** `x-api-key`, `Authorization: Bearer`, OAuth
      cliente, IP-whitelist, endpoint público… Nombre exacto del header
      o mecanismo.

Si falta cualquiera de estos 6, **no arrancamos el PR**. La única tarea
válida sin ellos es escribir/actualizar este documento.

---

## 1. Env var del secreto (si aplica)

Cuando el provider requiera key/secreto, se declara así:

- Nombre: `<PROVIDER>_<CREATOR>_API_KEY` en `UPPER_SNAKE_CASE`.
  - Ejemplo real: `KEYDROP_ZACKETIZOR_API_KEY`.
  - Un secreto por par creador+provider (no compartir entre creadores).
- Declaración en `src/lib/env.ts`:
  - Bloque `server:` (nunca `client:`).
  - `z.string().min(1).optional()` — opcional para que Preview siga
    compilando sin la key; el fetch degrada silenciosamente si falta.
- Alta en Vercel:
  - Por defecto **solo en Production** hasta que decidamos abrir
    Preview. El fetch degrada silenciosamente si la env falta.
  - Marcada como **sensitive**.
  - Nunca se pega por chat, PR, commit ni log.

**Prohibido:** loggear la key, headers completos, el body completo con
`Authorization`, el `.env` o el nombre de la variable en runtime. Ver
`docs/keydrop-single-giveaway-endpoint.md` para el patrón de
"probe seguro sin loggear secrets".

---

## 2. Probe seguro de la API

Antes de escribir ni una línea de código de producto, hacemos un probe
manual desde local:

1. **Probe sin key (control):** confirma que la ruta existe y qué error
   devuelve (401/403 esperado). Guarda el status code y el body corto
   como evidencia — este trozo se puede compartir por chat.
2. **Probe con key (Production Vercel Function Logs o local con
   `.env.local` temporal):** confirma shape real de `/api/list`,
   `/api/giveaway/:id` y cualquier endpoint relevante.
3. **Diagnóstico HEAD/GET de la URL de landing** que abre el CTA (ver
   patrón de KeyDrop: `keydrop.com/es/giveaways/{id}` con `<link
   rel="alternate">` para 12 locales). Confirma que **no da 404** y
   que **no es un soft-404 de SPA** disfrazado de 200.
4. **Diagnóstico de shortener si existe** (KeyDrop tiene `kd.link`
   como shortener oficial). Preferir siempre el shortener del provider
   sobre construir URLs propias.

**Salida esperada:** un doc corto en `docs/<provider>-<endpoint>-diagnostic.md`
con status codes observados, ejemplo de body real anonimizado (nombres
sustituidos si son sensibles) y decisión sobre qué URL usa el CTA.

---

## 3. Zod schema — `src/lib/external-giveaways/providers/<key>/zod-schemas.ts`

- Un archivo por provider.
- Sin `.strict()` — la API upstream puede añadir campos.
- Preservar typos upstream tal cual y corregirlos solo en el mapper
  (ej. KeyDrop tenía `duractionSeconds` y `fullfilled`).
- Exportar shape del item + shape de la response completa.
- Tests estructurales que fijen los campos clave contra un fixture
  realista (basado en el body del probe seguro).

---

## 4. Mapper → `ExternalGiveawayCard`

- Archivo `src/lib/external-giveaways/providers/<key>/mapper.ts`.
- Función `<provider>ItemToCard({ item, creatorSlug })` que devuelve
  `ExternalGiveawayCard` (shape común interna).
- El mapper es el que **construye el `externalUrl`** del CTA:
  1º shortener afiliado si existe, 2º path canónico con `id`,
  3º listing genérico. Nunca dominios legacy con 403 conocido.
- El mapper **no** llama a `fetch` directamente ni conoce env vars.
- Corrige typos upstream aquí y solo aquí.
- Tests:
  - Fixture base con id + código promocional.
  - Assert de que `externalUrl` incluye siempre el id cuando lo hay.
  - Assert de que el mapper nunca genera URL sobre un dominio legacy
    conocido (`key-drop.com` en el caso de KeyDrop → 403 Cloudflare).

---

## 5. Fetch → `src/lib/external-giveaways/providers/<key>/fetch.ts`

- Reutiliza `safeExternalFetch` del client-factory (`src/lib/external-giveaways/client-factory.ts`).
- Pasa la key **por config**, jamás en URL/query.
- `authHeader` explícito (`x-api-key`, `Authorization`, etc.).
- `revalidateSeconds` explícito (KeyDrop = 60s).
- Delega en el mapper para construir `externalUrl` — el fetch NO pasa
  URL como argumento al mapper.
- Export `<PROVIDER>_CONFIG: ProviderConfig` que se registra en el
  registry.

---

## 6. Provider registry — `src/lib/external-giveaways/providers.ts`

- Añadir el key nuevo al enum `ProviderKey` en
  `src/lib/external-giveaways/types.ts`. Un enum controlado, sin
  strings sueltos.
- Añadir entry en el `REGISTRY: Record<ProviderKey, ProviderConfig>`.
- El registry expone `displayName`, `logoAsset`, `listingUrl`,
  `accentColor`, `revalidateSeconds`, `fetchForCreator`. Todos
  requeridos.

---

## 7. Creator binding — `src/lib/external-giveaways/creator-bindings.ts`

- Añadir entry en `CREATOR_PROVIDER_BINDINGS` mapeando `slug` de
  `talents` → `{ provider, apiKey: () => env.<VAR> }`.
- La función `apiKey` se evalúa perezosamente para que la lectura de
  env solo ocurra en el servidor cuando el binding se dispara.
- Regla dura: **1 creador = 1 provider**. Si en el futuro un creador
  tuviera 2 partnerships simultáneos, hay que rediseñar bindings; hoy
  la sección de sorteos internos se oculta cuando hay binding externo,
  no se pueden mezclar.

---

## 8. `remotePatterns` de imágenes — `next.config.ts`

- Añadir el CDN del provider a `images.remotePatterns` en
  `next.config.ts` **incluso si actualmente usamos `<img>` HTML nativo
  en el card**. Es defensivo: cualquier migración futura a `next/image`
  no debe romper.
- Ejemplo real: KeyDrop CDN `cdnkd.com` + wildcard `*.cdnkd.com`.
- Verificar que el CDN sirve HTTPS.

---

## 9. Registrar assets del badge

- Añadir logo oficial del provider a `public/images/brands/<key>.png`
  con proporción similar a los de KeyDrop y SkinsMonkey.
- Referenciarlo desde el `logoAsset` del `ProviderConfig`.
- Verificar contraste sobre fondo oscuro del pill del provider en
  `platform-external-giveaways.css`.

---

## 10. Tests estructurales

Añadir en `src/__tests__/server/<provider>-provider-*.test.ts`:

- **Security tests:**
  - Env var declarada en `server:` bloc, opcional, con `.min(1)`.
  - Env no aparece en `client:` bloc.
  - Fetch pasa key por config, nunca en URL, sin `Authorization` en
    el path ni interpolaciones `${apiKey}`.
  - Ningún archivo del provider referencia la key en logs.
  - Ningún archivo del provider aparece en UI sin ir por el mapper
    (ni componente ni query pública).
- **Mapper tests:**
  - Fixture realista → contract completo de `ExternalGiveawayCard`.
  - `externalUrl` incluye siempre el `id` cuando existe.
  - `externalUrl` nunca cae en dominios legacy con 403 conocido.
- **Provider registry tests:**
  - Entry existe, `displayName` y `logoAsset` no vacíos.

---

## 11. QA en Preview

Con la env var configurada en el environment `Preview` de Vercel
(o solo `Production` si se decide no exponer key a Preview):

- Abrir `/sorteos/plataforma?creador=<slug>`.
- Verificar que aparece el badge del provider en la sección.
- Verificar que las cards renderizan `imageUrl`, `totalValue`,
  `participantCount`, `promoCode` y `endsAt`.
- Verificar que el CTA abre el sorteo concreto (no listado genérico
  ni 404).
- Verificar que si la key falta, la sección **no aparece** (el
  provider degrada a `{ status: 'not_configured' }` sin romper el
  render de la landing).
- Verificar que el placeholder mini de ranking del provider aparece
  debajo con el copy correcto (`"Ranking <provider> próximamente"`).

Si la QA en Preview no puede ejecutarse (key solo en Production), el
QA se hace directamente en Production tras el merge; documentarlo en
el PR.

---

## 12. Confirmar que no hay economía externa

Antes del merge, chequeo dedicado en el diff del PR:

- `git diff master..HEAD -- src` no incluye `coin_transactions`,
  `giveaway_entries`, `mission_claims`, `awardCoins` ni ninguna
  Server Action que escriba a estas tablas desde el flujo del
  provider externo.
- Los CTA del provider llevan a la web del provider — no a una ruta
  interna que dispare monedas ni tickets.
- Los rankings globales de SocialPro (`getMonthlyRanking`) siguen
  filtrando solo `giveaway_entries` internas — nunca agregan
  externos.

---

## 13. Commit trail y comunicación

Cada onboarding de provider es su propio PR:

- Título: `feat(sorteos): integrar sorteos <PROVIDER> de <CREADOR>`.
- Cuerpo: incluye los 6 datos de §0, el commit del probe seguro y el
  resumen de checks (TSC, jest, lint, CI verde).
- Sin merge hasta OK explícito del owner.

Al mergear, memoria (`~/.claude/.../memory/`) recibe una entry
`project_<provider>_<creator>_state.md` con:

- Fecha de alta.
- Env var name (no valor).
- Endpoint base.
- Restricciones conocidas del provider (rate limits, quirks).

---

## Anti-patrones a evitar

- **Provider "stub" en producción:** no meter una entry al registry
  con `fetchForCreator` que devuelva mocks. Si no hay integración
  real, no entra al enum.
- **Binding "de prueba":** no bindar un creador a un provider "para
  ver cómo queda". La sección externa aparecerá en la UI con datos
  falsos o vacíos.
- **Copy de código de otro provider:** cada API tiene su shape y su
  auth. No copiar el mapper de KeyDrop tal cual — copiar la
  estructura, sí; los campos y typos, no.
- **Ampliar la clave a otros creadores:** una key es por par
  `provider × creador`. No reutilizar la key de un creador para
  otro, aunque el provider sea el mismo, sin confirmación explícita
  del owner del acuerdo.
- **Meter monedas por participación externa:** aunque sea tentador
  "premiar" al usuario por clicar el CTA, cualquier reward externo
  compromete la contabilidad interna y el disclaimer legal de que
  la plataforma no tiene componente económico con partners.

---

## Estado de providers hoy (2026-07-06)

| Creador (slug) | Provider | Código | Estado |
|---|---|---|---|
| zacketizor | KeyDrop + CSGO-SKINS | ZACKCSGO | ✅ KeyDrop con API real; CSGO-SKINS como card promocional. |
| imantado | KeyDrop | IMANTADO | ✅ KeyDrop con API real (alta 2026-07-06). |
| naow | — | — | ⏸ Pendiente de deal + datos confirmados. |
| huasopeek | — | — | ⏸ Pendiente de deal + datos confirmados. |
| todocs2 | — | — | ⏸ Pendiente de deal + datos confirmados. |
| jolu | — | — | ⏸ Pendiente de deal + datos confirmados. |

*(martinez retirado del roster público 2026-07-03.)*

Nada más está confirmado. Los comentarios `csgoroll` / `hellcase` que
aparecen en `types.ts` son placeholders históricos y NO representan
partnerships activos.
