# Handoff — Activar misiones Discord + Twitch (ZACKETIZOR)

**Sesión:** 2026-07-30  
**Rama:** `master` local (1 commit ahead de origin — **no push directo a master**)  
**Repo prod:** `https://github.com/kekoesports/proyectozack.git`  
**Deploy prod:** Vercel del org/team que sirve `socialpro.es` — **sin acceso desde `rechedev9` / `rechedevs-projects`**

---

## 0. Regla de entrega (imprescindible)

| Qué | Cómo |
|---|---|
| Código / docs / seeds / migraciones | **Solo vía Pull Request** a `kekoesports/proyectozack` |
| Deploy a `socialpro.es` | Automático desde el pipeline del repo (quien mergea / tiene Vercel del dominio) |
| Env vars en prod/preview | **Humano con acceso al Vercel de `socialpro.es`** (no `proyectozack` en team Rechedev) |
| Seed en DB de prod | **Humano con `DATABASE_URL` de prod** (o CI/runbook autorizado) |

**No asumir** que `vercel link` al proyecto `proyectozack` de `rechedevs-projects` es prod.  
Ese proyecto sirve `proyectozack.vercel.app` y **no** es el host de `socialpro.es` (títulos y `/sorteos` distintos; dominio no accesible en ese team).

---

## 1. Objetivo

Activar misiones sociales verificables en `/sorteos/zacketizor`:

1. **Discord** — “Únete al Discord de ZACKETIZOR” (+100 pts)  
2. **Twitch** — “Sigue a ZACKETIZOR en Twitch” (+100 pts)  
3. **YouTube** — placeholder / doc — no esta fase  

Código Discord/Twitch **ya implementado** (Fase A/B). Falta: **PR si hay más código**, **env en Vercel correcto**, **seed en DB prod**, **invite Discord**.

---

## 2. Commits pendientes de PR

| Commit local | Contenido |
|---|---|
| `ee390609` | Twitch channel URL `zacketizor` → `zacketizorcs2` + docs/handoff |

**Siguiente git:** branch desde ese commit → push → `gh pr create` (no `git push origin master`).

---

## 3. Qué se hizo en la sesión (y qué NO aplica a prod)

Hecho bajo cuenta `rechedev9` / team `rechedevs-projects` / proyecto `proyectozack`:

- `vercel link` + `vercel env pull` → env local (DB/Twitch client del **ese** proyecto)
- Seed Twitch → misión `id=1` en **esa** `DATABASE_URL` (puede no ser la DB de `socialpro.es`)
- Env Discord/Twitch/TOKEN_ENCRYPTION_KEY subidos a **ese** Vercel (no al de `socialpro.es`)
- Redeploy → alias `proyectozack.vercel.app` only

**Tratar lo anterior como sandbox / no-prod** hasta que alguien confirme que la Neon de ese proyecto es la misma que prod (poco probable si el dominio vive en otro team).

---

## 4. Estado env local (`.env.local` — no en git)

| Variable | Estado | Notas |
|---|---|---|
| Discord client/secret/redirect/guild | SET | App SocialPro Giveaways; redirects en portal Discord OK para socialpro.es + localhost |
| `DISCORD_ZACKETIZOR_INVITE_URL` | **EMPTY** | Falta invite permanente humano |
| Twitch broadcaster + channel URL | SET | `549186441` / `https://www.twitch.tv/zacketizorcs2` |
| Twitch client id/secret (local) | SET vía pull del Vercel **equivocado** | Revalidar en el Vercel de prod real |
| `TOKEN_ENCRYPTION_KEY` | SET local | En prod: reutilizar el de prod si ya existe; si no, setear **una vez** y no rotar a la ligera |
| `DATABASE_URL` | SET vía pull **equivocado** | No usar para “activar prod” sin confirmación |

Portal Discord OAuth redirects (válidos para prod real):

- `https://socialpro.es/api/auth/social/discord/callback`
- `http://localhost:3000/api/auth/social/discord/callback`

---

## 5. Datos de producto (Zack)

| Plataforma | Dato |
|---|---|
| Discord guild | `1183418967608524820` |
| Twitch | https://www.twitch.tv/zacketizorcs2 · broadcaster `549186441` |
| YouTube | https://www.youtube.com/@ZaCkETiZORCS2 (después) |

---

## 6. Docs / scripts canónicos

- `docs/discord-mission-fase-a.md`
- `docs/twitch-mission-fase-b.md`
- `docs/youtube-missions-verification.md`
- Seed Discord: `scripts/seed-discord-mission-zacketizor.ts` + `CONFIRM_SEED_DISCORD_MISSION=I_ACCEPT_DISCORD_MISSION`
- Seed Twitch: `scripts/seed-twitch-mission-zacketizor.ts` + `CONFIRM_SEED_TWITCH_MISSION=I_ACCEPT_TWITCH_MISSION`
- Constants: `discord-missions.ts`, `twitch-missions.ts`

Scratch local (gitignored): `.scratch/social-missions-activate/`

---

## 7. Checklist activación REAL (socialpro.es)

### A. Código (agente / PR)

1. Branch + PR con cambios de código/docs (p.ej. URL Twitch `zacketizorcs2`).
2. Code review + merge (humano con acceso al repo).
3. Deploy lo hace el Vercel enlazado a GitHub del org (fuera de `rechedev9` si no está en ese team).

### B. Ops Vercel prod (humano con acceso al proyecto de `socialpro.es`)

Añadir (Production + Preview según corresponda), **sin commitear secrets**:

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_OAUTH_REDIRECT_URL=https://socialpro.es/api/auth/social/discord/callback
DISCORD_ZACKETIZOR_GUILD_ID=1183418967608524820
DISCORD_ZACKETIZOR_INVITE_URL=https://discord.gg/<invite>
TOKEN_ENCRYPTION_KEY   # reutilizar si ya existe en prod
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
TWITCH_OAUTH_REDIRECT_URL=https://socialpro.es/api/auth/social/twitch/callback
TWITCH_ZACKETIZOR_BROADCASTER_ID=549186441
TWITCH_ZACKETIZOR_CHANNEL_URL=https://www.twitch.tv/zacketizorcs2
```

Redeploy tras setear env.

### C. Seed (humano con DATABASE_URL de prod)

```powershell
$env:CONFIRM_SEED_DISCORD_MISSION='I_ACCEPT_DISCORD_MISSION'
npx tsx --env-file=.env.local scripts/seed-discord-mission-zacketizor.ts

$env:CONFIRM_SEED_TWITCH_MISSION='I_ACCEPT_TWITCH_MISSION'
npx tsx --env-file=.env.local scripts/seed-twitch-mission-zacketizor.ts
```

### D. Smoke en prod

1. `/sorteos` — cards Discord/Twitch activas (no “PRÓXIMAMENTE”).
2. Conectar Discord → unirse al guild → verificar +100.
3. Conectar Twitch → follow → verificar +100.

---

## 8. Bloqueos

| Bloqueo | Quién |
|---|---|
| Acceso Vercel de `socialpro.es` | Humano / org |
| Acceso merge + deploy del repo | Humano en `kekoesports` |
| Invite Discord permanente | Humano (admin server Zack) |
| Secrets solo en Vercel/local, nunca en git | Agente |

---

## 9. Pickup rápido

```text
1. Leer este handoff
2. Todo código → branch + PR a kekoesports/proyectozack (no push master, no vercel del team Rechedev como prod)
3. Pedir invite Discord + lista de env al owner de Vercel socialpro.es
4. Tras merge: seed + smoke en prod (humano con DB/Vercel)
```
