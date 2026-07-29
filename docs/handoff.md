# Handoff — Activar misiones Discord + Twitch (ZACKETIZOR)

**Sesión:** 2026-07-29 → 2026-07-30  
**Rama:** `master`  
**Motivo del reinicio:** cargar **Chrome DevTools MCP** (`chrome-devtools` en `~/.grok/config.toml`) y seguir la activación.

---

## 1. Objetivo

Activar misiones sociales verificables en `/sorteos/zacketizor`:

1. **Discord** — “Únete al Discord de ZACKETIZOR” (+100 pts) — casi listo de config  
2. **Twitch** — “Sigue a ZACKETIZOR en Twitch” (+100 pts) — IDs listos, falta app OAuth  
3. **YouTube** — solo placeholder / doc (`docs/youtube-missions-verification.md`) — no esta fase  

Código de misiones Discord/Twitch **ya implementado** (Fase A/B). Lo que falta es **env + seed + Vercel**.

---

## 2. Commits / cambios de código

| Qué | Estado |
|---|---|
| Twitch public URL `zacketizor` → `zacketizorcs2` | en commit de esta sesión |
| Doc `docs/twitch-mission-fase-b.md` alineado al login real | en commit de esta sesión |
| Chrome MCP en Grok | `~/.grok/config.toml` → `[mcp_servers.chrome-devtools]` (`npx -y chrome-devtools-mcp@latest`) — **fuera del repo** |

**No commitear:** `.env.local` (gitignored), `.scratch/` (gitignored).

---

## 3. Estado env local (`.env.local` — no en git)

| Variable | Estado |
|---|---|
| `DISCORD_CLIENT_ID` | **SET** `1532140959805079712` (app SocialPro Giveaways) |
| `DISCORD_CLIENT_SECRET` | **SET** (32 chars, regenerado con MFA — no loguear) |
| `DISCORD_OAUTH_REDIRECT_URL` | **SET** `https://socialpro.es/api/auth/social/discord/callback` |
| `DISCORD_ZACKETIZOR_GUILD_ID` | **SET** `1183418967608524820` |
| `DISCORD_ZACKETIZOR_INVITE_URL` | **EMPTY** — falta invite permanente |
| `TWITCH_ZACKETIZOR_BROADCASTER_ID` | **SET** `549186441` |
| `TWITCH_ZACKETIZOR_CHANNEL_URL` | **SET** `https://www.twitch.tv/zacketizorcs2` |
| `TWITCH_CLIENT_ID` / `SECRET` / OAuth redirect | **EMPTY** |
| `TOKEN_ENCRYPTION_KEY` | **SET** local (64 hex). Si prod ya tiene uno, **reutilizar el de prod** al desplegar |
| `DATABASE_URL` | **EMPTY** — bloquea seed |

Portal Discord OAuth redirects **persistidos**:

- `https://socialpro.es/api/auth/social/discord/callback`
- `http://localhost:3000/api/auth/social/discord/callback`

App: https://discord.com/developers/applications/1532140959805079712/oauth2

---

## 4. Datos de producto (Zack)

| Plataforma | Dato |
|---|---|
| Discord guild | `1183418967608524820` |
| Twitch | https://www.twitch.tv/zacketizorcs2 · broadcaster `549186441` |
| YouTube | https://www.youtube.com/@ZaCkETiZORCS2 (después) |

UI actual en prod: cards Discord/Twitch/YouTube en **“PRÓXIMAMENTE”** hasta que env + seed activen las reales.

---

## 5. Docs / scripts canónicos

- `docs/discord-mission-fase-a.md` — runbook Discord  
- `docs/twitch-mission-fase-b.md` — runbook Twitch  
- `docs/youtube-missions-verification.md` — YouTube (aplazado)  
- `docs/social-missions-twitch-kick-discord.md` — auditoría  
- Seed Discord: `scripts/seed-discord-mission-zacketizor.ts`  
  - `CONFIRM_SEED_DISCORD_MISSION=I_ACCEPT_DISCORD_MISSION`  
- Seed Twitch: `scripts/seed-twitch-mission-zacketizor.ts`  
  - `CONFIRM_SEED_TWITCH_MISSION=I_ACCEPT_TWITCH_MISSION`  
- Config maps:  
  - `src/features/giveaway-platform/constants/discord-missions.ts`  
  - `src/features/giveaway-platform/constants/twitch-missions.ts`  

Scratch local (gitignored): `.scratch/social-missions-activate/` (checklist, helpers CDP).

---

## 6. Chrome / browser

- **Chrome MCP** configurado en Grok: `chrome-devtools` via `npx chrome-devtools-mcp@latest` (v1.6.0 cacheado).  
  **Requiere reinicio de sesión Grok** para que `search_tool` lo vea.  
- Sesión anterior usó **`browser-tools`** CDP puerto ~`50837` (Chrome del usuario con Discord logueado).  
- Helpers en `.scratch/social-missions-activate/cdp-eval.mjs` y `cdp-type.mjs` (para Input domain si React no acepta value setter).  
- Al setear redirects Discord: hay que **escribir con Input real** y pulsar **Save Changes** (no auto-save silencioso fiable).

---

## 7. Próximos 2–5 pasos (orden)

1. **Pickup:** confirmar Chrome MCP vivo (`search_tool` → chrome/devtools/navigate).  
2. Pedir al usuario **`DISCORD_ZACKETIZOR_INVITE_URL`** (`https://discord.gg/...`) y **`DATABASE_URL`** (o `vercel link` + `vercel env pull`).  
3. Completar `.env.local` invite + DB.  
4. Seed Discord (solo cuando secret + guild + invite + DB):  
   ```powershell
   $env:CONFIRM_SEED_DISCORD_MISSION='I_ACCEPT_DISCORD_MISSION'
   npx tsx --env-file=.env.local scripts/seed-discord-mission-zacketizor.ts
   ```  
5. Añadir las mismas vars Discord (+ `TOKEN_ENCRYPTION_KEY` de **prod** si ya existe) en **Vercel** Production/Preview.  
6. Twitch: login en https://dev.twitch.tv/console/apps → app + redirects  
   - `https://socialpro.es/api/auth/social/twitch/callback`  
   - `http://localhost:3000/api/auth/social/twitch/callback`  
   → `TWITCH_CLIENT_ID` / `SECRET` → seed Twitch.  
7. Smoke: conectar Discord en `/sorteos`, unirse al guild, verificar +100 pts.

---

## 8. Bloqueos

| Bloqueo | Quién |
|---|---|
| Invite Discord permanente | Humano (admin del server Zack) |
| `DATABASE_URL` local | Humano / Vercel env pull |
| Twitch Developer login | Humano (Chrome con sesión Twitch) |
| Vars en Vercel | Humano o CLI tras `vercel link` |
| No commitear secrets | Agente — nunca `.env.local` |

---

## 9. Riesgos

- **`TOKEN_ENCRYPTION_KEY`**: si se genera uno nuevo en local distinto al de prod, los tokens OAuth cifrados en prod no se pueden descifrar. Preferir copiar el de Vercel.  
- Client Secret Discord **ya regenerado una vez** — el valor actual solo está en `.env.local` (y hay que subirlo a Vercel). Si se pierde: Reset Secret + MFA de nuevo.  
- Push a master: cambios de código de esta sesión son mínimos (URL Twitch); seeds/migraciones no tocados. Activación runtime es env+seed, no merge obligatorio.

---

## 10. Pickup rápido (siguiente sesión)

```text
1. Leer este docs/handoff.md
2. Verificar chrome-devtools MCP conectado
3. git status -sb; cat .env.local keys (solo nombres/SET, no valores)
4. Pedir INVITE + DATABASE_URL si siguen empty
5. Seed Discord → Vercel env Discord → Twitch console
```
