# Diagnóstico: `GET /v1/giveaway-user/api/giveaway/:idGiveaway`

**Estado:** Diagnóstico parcial — 2026-07-03
**Ámbito:** Integración KeyDrop / provider externo
**Autor:** overnight session follow-up (Claude)

---

## Objetivo del diagnóstico

Determinar si el endpoint singular de KeyDrop devuelve lista de participantes
verificable, para poder rellenar el ranking por provider (ZACKETIZOR) con
datos reales en lugar del placeholder "Próximamente".

---

## Resultado

### Endpoint EXISTE
Base: `https://ws-2071.socket-cs.com/v1/giveaway-user/api/giveaway/{id}`

Probé con `id = o3S8gi66000` (activo real, mismo id que uso en tests
estructurales) **sin api key** — respuesta:

```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"success":false,"message":"Invalid api key","errorCode":"invalidApiKey"}
```

Es decir, el endpoint responde con la misma auth que `/api/list`
(header `x-api-key`). No devuelve 404 → **la ruta existe**.

### Lo que NO se ha podido verificar

`KEYDROP_ZACKETIZOR_API_KEY` vive **solo en Vercel Production**. Preview y
Development no la tienen. Yo no tengo la key localmente y la política del
proyecto es **no pedirla ni loguearla**. Por tanto no he podido:

- Consultar la shape real de la respuesta con `success: true`.
- Confirmar si expone `participants[]`, `winners[]`, o solo `participantCount`
  y `winners[]` como `/api/list`.

### Hipótesis (basada en el probe previo del schema `/api/list`)

El schema activo de `/api/list` ya expone `winners[]` completo para los
sorteos finalizados y `participantCount: number` (sin lista) para los
activos. Es probable que el singular sea idéntico:

- **Caso A (probable):** el endpoint singular devuelve el mismo shape que
  cada item de `/api/list[].active` o `.finished`. No aporta lista de
  participantes. Utilidad marginal — con `/api/list` ya tenemos todo.
- **Caso B (posible pero menos probable):** devuelve además una lista de
  `participants[]` que `/api/list` no incluye. Utilidad alta para el
  ranking.

Sin key en Preview no puedo distinguir A vs B.

---

## Consecuencia para el UI

Mientras no confirmemos B, **el ranking por provider queda como placeholder
pequeño y honesto** en `ProviderRankingPlaceholder.tsx`:

> 🏆 **Ranking KeyDrop próximamente.**
> Se activará cuando podamos leer participantes verificables de los sorteos
> de {creator}.

Ver commit del follow-up post-PR #170.

---

## Cómo avanzar (opciones)

1. **Añadir la key a Preview.** Riesgo bajo (misma key, entorno aislado).
   Con eso Vercel Function Logs muestra el body real de la respuesta al
   pedir el endpoint singular. Requiere confirmación explícita del owner
   antes de tocar env vars.
2. **Consultar en Production con el logger seguro que ya emitimos** —
   `console.log('[keydrop]', { provider, creatorSlug, status, count })`
   sin secrets. Añadir temporalmente un probe controlado.
3. **Contactar al equipo KeyDrop** — pedir docs oficial del endpoint
   singular. Vía account manager del programa affiliate.

Opciones 1 y 3 son las más rápidas. La 2 se puede hacer sin exponer la key
pero requiere merge de código de "probe" que luego debería revertirse.

---

## Reglas respetadas

- **No he impreso ni pedido la key.**
- **No he intentado extraer la key de env vars ni logs.**
- **No he añadido logs que contengan `x-api-key`, headers completos,
  `.env`, ni el nombre `KEYDROP_ZACKETIZOR_API_KEY`.**
- Solo he ejecutado un HEAD/GET público sin auth para confirmar que la
  ruta existe (respuesta 401 esperada sin key).
