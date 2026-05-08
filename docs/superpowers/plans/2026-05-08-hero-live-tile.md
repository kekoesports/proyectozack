# Hero Live Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el hero de la home como un layout asimétrico con un live tile dinámico que muestre quién está en directo ahora (estado A) o un mosaico del roster (estado B), reutilizando `/api/live`.

**Architecture:** Extraer formatters y hook de fetch live a módulos compartidos, crear `HeroLiveTile.tsx` con tres estados (loading / live / offline-mosaic), y refactorizar `Hero.tsx` a un grid `[1fr_360px]` en lg+ con stack vertical en mobile. Stats `13+ AÑOS · 15M VIEWS · 340 FTDS` pasan a inline arriba de los CTAs; logo X grande centrado eliminado.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · motion/react · TypeScript strict · Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-08-hero-live-tile-design.md`

---

## File Structure

**Created:**
- `src/lib/live-format.ts` — funciones puras `formatViewers` y `gameBadge` (extracted)
- `src/lib/__tests__/client/live-format.test.ts` — unit tests para los formatters
- `src/features/live/hooks/useLiveData.ts` — hook `useLiveData()` que encapsula fetch + interval contra `/api/live`
- `src/features/marketing-site/components/HeroLiveTile.tsx` — client component con estados loading/live/offline
- `src/features/marketing-site/components/HeroStats.tsx` — fila inline de 3 stats (extracted)

**Modified:**
- `src/features/marketing-site/components/Hero.tsx` — grid asimétrico, sin logo X, stats inline, monta `<HeroLiveTile />`
- `src/features/live/components/LiveSection.tsx` — usa `live-format` y `useLiveData`; añade `id="en-directo"` al `<section>`

**Touched indirectly:** ningún archivo más. `/api/live` no cambia.

---

## Task 1: Extract formatters to `lib/live-format.ts` with tests

**Files:**
- Create: `src/lib/live-format.ts`
- Create: `src/lib/__tests__/client/live-format.test.ts`
- Modify: `src/features/live/components/LiveSection.tsx` (eliminar funciones locales, importar)

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/client/live-format.test.ts`:

```ts
import { formatViewers, gameBadge } from '@/lib/live-format';

describe('formatViewers', () => {
  it('returns empty string for null', () => {
    expect(formatViewers(null)).toBe('');
  });

  it('returns empty string for 0', () => {
    expect(formatViewers(0)).toBe('');
  });

  it('formats <1000 as plain integer', () => {
    expect(formatViewers(42)).toBe('42');
    expect(formatViewers(999)).toBe('999');
  });

  it('formats >=1000 as K with one decimal', () => {
    expect(formatViewers(1000)).toBe('1.0K');
    expect(formatViewers(12400)).toBe('12.4K');
    expect(formatViewers(99999)).toBe('100.0K');
  });
});

describe('gameBadge', () => {
  it('detects CS2 from "cs2" or "counter"', () => {
    expect(gameBadge('CS2')).toBe('CS2');
    expect(gameBadge('Counter-Strike 2')).toBe('CS2');
  });

  it('detects Valorant', () => {
    expect(gameBadge('VALORANT')).toBe('Valorant');
  });

  it('detects Variety from "variety", "varios", "general"', () => {
    expect(gameBadge('Just Chatting / Variety')).toBe('Variety');
    expect(gameBadge('Varios juegos')).toBe('Variety');
    expect(gameBadge('General gaming')).toBe('Variety');
  });

  it('detects Fortnite', () => {
    expect(gameBadge('Fortnite Battle Royale')).toBe('Fortnite');
  });

  it('detects LoL from "lol" or "league"', () => {
    expect(gameBadge('LoL')).toBe('LoL');
    expect(gameBadge('League of Legends')).toBe('LoL');
  });

  it('falls back to first word for unknown games', () => {
    expect(gameBadge('Apex Legends')).toBe('Apex');
    expect(gameBadge('Minecraft')).toBe('Minecraft');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/__tests__/client/live-format.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/live-format'`.

- [ ] **Step 3: Implement the module**

Create `src/lib/live-format.ts`:

```ts
/**
 * Formatea un viewer count para display. Null/0 → "" para que el caller
 * decida si mostrar nada o un fallback "LIVE".
 */
export function formatViewers(n: number | null): string {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

/**
 * Deriva un badge corto de juego a partir del nombre completo.
 * Cubre los nichos del roster (CS2, Valorant, Variety, Fortnite, LoL)
 * y cae a la primera palabra para todo lo demás.
 */
export function gameBadge(game: string): string {
  const g = game.toLowerCase();
  if (g.includes('cs2') || g.includes('counter')) return 'CS2';
  if (g.includes('valorant')) return 'Valorant';
  if (g.includes('variety') || g.includes('varios') || g.includes('general')) return 'Variety';
  if (g.includes('fortnite')) return 'Fortnite';
  if (g.includes('lol') || g.includes('league')) return 'LoL';
  return game.split(' ')[0] ?? game;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/__tests__/client/live-format.test.ts
```

Expected: PASS — 8 tests passing.

- [ ] **Step 5: Refactor `LiveSection.tsx` to use the shared module**

Edit `src/features/live/components/LiveSection.tsx`:

Remove the two local function definitions:

```ts
function formatViewers(n: number | null): string {
  if (!n) return '';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// Derivar badge de juego a partir del campo game
function gameBadge(game: string): string {
  const g = game.toLowerCase();
  if (g.includes('cs2') || g.includes('counter')) return 'CS2';
  if (g.includes('valorant')) return 'Valorant';
  if (g.includes('variety') || g.includes('varios') || g.includes('general')) return 'Variety';
  if (g.includes('fortnite')) return 'Fortnite';
  if (g.includes('lol') || g.includes('league')) return 'LoL';
  return game.split(' ')[0] ?? game; // primera palabra del juego
}
```

And add the import at the top (next to the other `@/lib/` imports if any; if none, after the Next imports):

```ts
import { formatViewers, gameBadge } from '@/lib/live-format';
```

- [ ] **Step 6: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- src/features/live/components/LiveSection.tsx src/lib/live-format.ts
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
scripts/committer "refactor(live): extract formatViewers and gameBadge to lib/live-format with tests" \
  src/lib/live-format.ts \
  src/lib/__tests__/client/live-format.test.ts \
  src/features/live/components/LiveSection.tsx
```

---

## Task 2: Extract `useLiveData` hook

**Files:**
- Create: `src/features/live/hooks/useLiveData.ts`
- Modify: `src/features/live/components/LiveSection.tsx` (consume el hook)

- [ ] **Step 1: Implement the hook**

Create `src/features/live/hooks/useLiveData.ts`:

```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LiveTalent, TwitchRosterEntry } from '@/lib/queries/live';

export type LiveData = {
  featured: LiveTalent | null;
  others: LiveTalent[];
  roster: TwitchRosterEntry[];
  total: number;
};

const REFRESH_MS = 120_000;

/**
 * Encapsula el fetch a /api/live + refresh interval. Retorna `data: null`
 * mientras carga la primera vez; los componentes deben mostrar skeleton.
 *
 * Usado por LiveSection (sección expandida) y HeroLiveTile (tile compacto
 * en hero). Si en el futuro se monta más de un consumer en la misma página,
 * considerar mover a un context para deduplicar el fetch.
 */
export function useLiveData(): { data: LiveData | null; loading: boolean } {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      if (!res.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = await res.json() as LiveData;
      setData(json);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLive();
    const interval = setInterval(() => { void fetchLive(); }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  return { data, loading };
}
```

- [ ] **Step 2: Refactor `LiveSection.tsx` to consume the hook**

In `src/features/live/components/LiveSection.tsx`:

Remove the local `LiveData` type, the `REFRESH_MS` constant, the `data`/`loading` `useState`s, the `fetchLive` `useCallback`, and the `useEffect` that mounts the interval — replace the block at the top of the `LiveSection` function with:

```tsx
export function LiveSection() {
  const { data, loading } = useLiveData();

  if (loading) return (
    <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]" aria-hidden>
      <div className="max-w-5xl mx-auto h-48 rounded-xl bg-white/[0.02] animate-pulse" />
    </section>
  );
  if (!data || data.roster.length === 0) return null;

  const { featured, others, roster, total } = data;
  // …resto sin cambios
}
```

Add the import at the top:

```ts
import { useLiveData } from '@/features/live/hooks/useLiveData';
```

Remove the now-unused imports: `useState`, `useEffect`, `useCallback` (if no longer referenced), and the local `LiveTalent`/`TwitchRosterEntry` type import line — verify `LiveTalent` y `TwitchRosterEntry` aún se usen en JSX (props `featured`, `roster`); si sí, mantén el import.

- [ ] **Step 3: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- src/features/live
```

Expected: both pass.

- [ ] **Step 4: Smoke test in browser**

```bash
npm run dev
```

Visita `http://localhost:3000/`, scrollea hasta `LiveSection`. Verifica:
- Carga el skeleton inicial.
- Después aparece la sección con featured + roster sidebar (o el grid de fallback si nadie está live).
- DevTools Network: hay un solo `GET /api/live` cada ~2 minutos (el `useEffect` no duplica).

- [ ] **Step 5: Commit**

```bash
scripts/committer "refactor(live): extract useLiveData hook for shared fetch logic" \
  src/features/live/hooks/useLiveData.ts \
  src/features/live/components/LiveSection.tsx
```

---

## Task 3: Add `id="en-directo"` anchor to LiveSection

**Files:**
- Modify: `src/features/live/components/LiveSection.tsx` (3 lugares: ambos `<section>` raíz)

- [ ] **Step 1: Add id to both `<section>` returns**

En `LiveSection.tsx` hay dos `return ( <section …>` en la función:
1. Estado "Hay live" (`if (isLiveNow && featured)`).
2. Estado "Nadie live — fallback" (final return).

Añadir `id="en-directo"` a ambos. Antes:

```tsx
return (
  <section className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
```

Después:

```tsx
return (
  <section id="en-directo" className="bg-sp-black py-16 px-4 sm:px-6 border-t border-white/[0.06]">
```

Y para el segundo return (fallback):

```tsx
return (
  <section id="en-directo" className="bg-sp-black py-14 px-4 sm:px-6 border-t border-white/[0.06]">
```

(El skeleton de loading queda sin id — está `aria-hidden`, no es destino de ancla.)

- [ ] **Step 2: Verify anchor**

```bash
npm run dev
```

Abre `http://localhost:3000/#en-directo`. Debe scrollear directamente a la sección live.

- [ ] **Step 3: Commit**

```bash
scripts/committer "feat(live): add #en-directo anchor for hero live tile links" \
  src/features/live/components/LiveSection.tsx
```

---

## Task 4: Create `HeroLiveTile` skeleton + null-data states

**Files:**
- Create: `src/features/marketing-site/components/HeroLiveTile.tsx`

Este task crea el componente con loading + early-return-null. Los estados A y B se añaden en tasks 5 y 6.

- [ ] **Step 1: Write the component shell**

Create `src/features/marketing-site/components/HeroLiveTile.tsx`:

```tsx
'use client';

import { useLiveData } from '@/features/live/hooks/useLiveData';

/**
 * Tile compacto del hero que muestra señal en directo (estado A) o un
 * mosaico del roster cuando nadie está live (estado B). Carga en paralelo
 * al H1 (LCP); muestra skeleton hasta que `/api/live` responde.
 *
 * @kind client
 * @feature marketing-site
 * @route /
 */
export function HeroLiveTile() {
  const { data, loading } = useLiveData();

  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="w-full lg:w-[360px] aspect-[4/5] rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
      />
    );
  }

  if (!data || data.roster.length === 0) return null;

  // Placeholder hasta tasks 5 y 6
  return (
    <div className="w-full lg:w-[360px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-white/40 text-sm">
      Hero live tile — pendiente estados A/B
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
scripts/committer "feat(hero): add HeroLiveTile skeleton component (loading + null states)" \
  src/features/marketing-site/components/HeroLiveTile.tsx
```

---

## Task 5: Implement `HeroLiveTile` Estado A (someone live)

**Files:**
- Modify: `src/features/marketing-site/components/HeroLiveTile.tsx`

- [ ] **Step 1: Add Estado A rendering**

Reemplaza el placeholder return en `HeroLiveTile.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLiveData } from '@/features/live/hooks/useLiveData';
import { formatViewers, gameBadge } from '@/lib/live-format';
import { trackEvent } from '@/lib/analytics';
import type { LiveTalent } from '@/lib/queries/live';

function getThumbUrl(featured: LiveTalent): string | null {
  if (!featured.handle) return featured.photoUrl;
  if (featured.platform === 'twitch') {
    // Cache-bust manual cada minuto para que el preview de Twitch refresque
    const bucket = Math.floor(Date.now() / 60_000);
    return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${featured.handle.toLowerCase()}-440x248.jpg?t=${bucket}`;
  }
  if (featured.platform === 'youtube' && featured.liveVideoId) {
    return `https://i.ytimg.com/vi/${featured.liveVideoId}/hqdefault_live.jpg`;
  }
  return featured.photoUrl;
}

function FeaturedTile({ featured, othersCount }: { featured: LiveTalent; othersCount: number }) {
  const initialThumb = getThumbUrl(featured);
  const [thumbSrc, setThumbSrc] = useState<string | null>(initialThumb);
  const onThumbError = () => {
    if (thumbSrc !== featured.photoUrl) setThumbSrc(featured.photoUrl);
  };
  const streamHref = featured.streamUrl ?? `https://www.twitch.tv/${featured.handle}`;
  const badge = featured.gameName ? gameBadge(featured.gameName) : null;
  const viewers = formatViewers(featured.viewerCount);

  return (
    <div className="w-full lg:w-[360px] rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <span
          className="w-2 h-2 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none"
          aria-label="En directo ahora"
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">LIVE</span>
        {viewers && (
          <span className="text-[11px] font-bold text-red-400 ml-1">{viewers}</span>
        )}
        {badge && (
          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/60">
            {badge}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <a
        href={streamHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('cta_click', { cta_id: 'hero_live_tile_featured', cta_destination: streamHref })}
        className="block relative aspect-video bg-sp-black overflow-hidden group"
      >
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={`Stream de ${featured.name}`}
            onError={onThumbError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">Sin preview</div>
        )}
      </a>

      {/* Meta */}
      <div className="px-3 py-3 border-b border-white/[0.06]">
        <p className="font-display text-base font-black uppercase text-white leading-tight">{featured.name}</p>
        {featured.streamTitle && (
          <p className="text-xs text-white/45 mt-0.5 line-clamp-1">{featured.streamTitle}</p>
        )}
      </div>

      {/* +N más en directo */}
      {othersCount > 0 && (
        <a
          href="#en-directo"
          className="block px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 hover:text-white transition-colors"
        >
          +{othersCount} más en directo →
        </a>
      )}
    </div>
  );
}

export function HeroLiveTile() {
  const { data, loading } = useLiveData();

  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="w-full lg:w-[360px] aspect-[4/5] rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
      />
    );
  }

  if (!data || data.roster.length === 0) return null;

  // Estado A — alguien live
  if (data.total > 0 && data.featured) {
    return <FeaturedTile featured={data.featured} othersCount={data.others.length} />;
  }

  // Estado B — pendiente task 6
  return null;
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- src/features/marketing-site/components/HeroLiveTile.tsx
```

Expected: both pass.

- [ ] **Step 3: Smoke test (optional — depende de que haya alguien live)**

Si hay alguien live cuando ejecutas el plan, monta brevemente el componente en una página de prueba o en el hero (anticipando task 7) para verificar visualmente el estado A. Si no hay nadie live ahora mismo, deja la verificación para el manual final.

- [ ] **Step 4: Commit**

```bash
scripts/committer "feat(hero): add HeroLiveTile state A (someone live with thumbnail and viewers)" \
  src/features/marketing-site/components/HeroLiveTile.tsx
```

---

## Task 6: Implement `HeroLiveTile` Estado B (offline mosaic)

**Files:**
- Modify: `src/features/marketing-site/components/HeroLiveTile.tsx`

- [ ] **Step 1: Add Estado B rendering**

En `HeroLiveTile.tsx`, añade el componente `OfflineMosaic` y reemplaza el `return null` final del Estado B.

Añade el import si no está:

```ts
import Link from 'next/link';
import type { TwitchRosterEntry } from '@/lib/queries/live';
```

Añade arriba de `export function HeroLiveTile()`:

```tsx
function pickMosaic(roster: TwitchRosterEntry[]): TwitchRosterEntry[] {
  const manual = roster.filter((e) => e.featuredFallback);
  const pool = manual.length >= 6 ? manual : [...manual, ...roster.filter((e) => !e.featuredFallback)];
  return pool.slice(0, 6);
}

function OfflineMosaic({ roster }: { roster: TwitchRosterEntry[] }) {
  const cells = pickMosaic(roster);
  return (
    <div className="w-full lg:w-[360px] rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <span
          className="w-2 h-2 rounded-full bg-white/30 animate-pulse motion-reduce:animate-none"
          aria-label="Roster offline"
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/55">Roster</span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          0 en directo
        </span>
      </div>

      {/* Mosaic 3×2 */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.04]">
        {cells.map((entry, i) => {
          const href = entry.streamUrl ?? `https://www.twitch.tv/${entry.handle}`;
          return (
            <a
              key={entry.talentId}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('cta_click', { cta_id: 'hero_live_tile_roster_card', cta_destination: href })}
              className="relative aspect-square bg-sp-black overflow-hidden group"
            >
              {entry.photoUrl ? (
                <Image
                  src={entry.photoUrl}
                  alt={entry.name}
                  fill
                  sizes="120px"
                  priority={i < 2}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-white/30">
                  {entry.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[10px] font-bold uppercase tracking-tight text-white truncate">
                  {entry.name}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Footer */}
      <Link
        href="#en-directo"
        className="block px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/55 hover:text-white transition-colors"
      >
        Síguelos en Twitch →
      </Link>
    </div>
  );
}
```

Y reemplaza el `// Estado B — pendiente task 6 \n return null;` por:

```tsx
  // Estado B — nadie live, mosaico del roster
  return <OfflineMosaic roster={data.roster} />;
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- src/features/marketing-site/components/HeroLiveTile.tsx
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
scripts/committer "feat(hero): add HeroLiveTile state B (offline roster mosaic 3x2)" \
  src/features/marketing-site/components/HeroLiveTile.tsx
```

---

## Task 7: Extract `HeroStats` inline strip

**Files:**
- Create: `src/features/marketing-site/components/HeroStats.tsx`

- [ ] **Step 1: Implement the component**

Create `src/features/marketing-site/components/HeroStats.tsx`:

```tsx
'use client';

import * as m from 'motion/react-client';

const HERO_STATS = [
  { value: '13+', label: 'AÑOS' },
  { value: '15M', label: 'VIEWS/MES' },
  { value: '+340', label: 'FTDS' },
] as const;

/**
 * Fila inline de stats que se renderiza entre subhead y CTAs en el hero.
 * Sustituye al bloque `mt-20` que vivía debajo del fold.
 */
export function HeroStats() {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="flex items-center gap-4 sm:gap-6 mb-6 text-xs sm:text-sm font-bold uppercase tracking-[0.2em]"
    >
      {HERO_STATS.map(({ value, label }, i) => (
        <div key={label} className="flex items-center gap-4 sm:gap-6">
          {i > 0 && <span aria-hidden="true" className="text-sp-muted2/40">·</span>}
          <span>
            <span className="text-white">{value}</span>
            <span className="text-sp-muted2/80 ml-1.5">{label}</span>
          </span>
        </div>
      ))}
    </m.div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
scripts/committer "feat(hero): extract HeroStats inline strip component" \
  src/features/marketing-site/components/HeroStats.tsx
```

---

## Task 8: Refactor `Hero.tsx` to asymmetric grid

**Files:**
- Modify: `src/features/marketing-site/components/Hero.tsx`

Este task elimina el logo X grande, baja la escala del H1 en lg, mete `HeroStats` arriba de los CTAs, elimina el bloque mt-20 al final, y monta `HeroLiveTile` a la derecha.

- [ ] **Step 1: Replace `Hero.tsx` content**

Reemplaza completamente `src/features/marketing-site/components/Hero.tsx` con:

```tsx
'use client';

import { useEffect } from 'react';
import * as m from 'motion/react-client';
import { useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';

import { trackEvent } from '@/lib/analytics';
import { HeroLiveTile } from '@/features/marketing-site/components/HeroLiveTile';
import { HeroStats } from '@/features/marketing-site/components/HeroStats';

/**
 * Hero principal de la home: layout asimétrico con tipografía grande
 * a la izquierda y un live tile dinámico a la derecha (≥lg). Las auras
 * parallax responden al cursor con springs y respetan
 * `prefers-reduced-motion`.
 *
 * @kind client
 * @feature marketing-site
 * @route /
 * @example
 * ```tsx
 * <Hero />
 * ```
 */
export function Hero() {
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 25 });

  const pinkX = useTransform(smoothX, [0, 1], [-50, 50]);
  const pinkY = useTransform(smoothY, [0, 1], [-50, 50]);
  const orangeX = useTransform(smoothX, [0, 1], [25, -25]);
  const orangeY = useTransform(smoothY, [0, 1], [20, -20]);

  useEffect(() => {
    if (reduced) return;
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) return;
    const onMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [mouseX, mouseY, reduced]);

  return (
    <section className="relative bg-sp-black text-white overflow-hidden min-h-dvh flex flex-col pt-16">
      {/* Aura layer — paint-contained */}
      <div className="absolute inset-0 pointer-events-none [contain:paint]">
        <m.div
          className="absolute top-1/3 left-0 -ml-[200px] -mt-[300px] will-change-transform"
          style={{ x: pinkX, y: pinkY }}
        >
          <div className="hero-aura-pink hero-aura-pink-bg w-[700px] h-[700px] rounded-full blur-[16px] sm:blur-[60px]" />
        </m.div>
        <m.div
          className="absolute top-[-10%] right-[-10%] will-change-transform"
          style={{ x: orangeX, y: orangeY }}
        >
          <div className="hero-aura-orange hero-aura-orange-bg w-[600px] h-[600px] rounded-full blur-[20px] sm:blur-[70px]" />
        </m.div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex items-center pb-16 lg:pb-0">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-center">
          {/* Columna izquierda — type + CTA */}
          <div className="flex flex-col text-left">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.4em] text-sp-muted2 mb-6">
              Gaming &amp; Esports · España · LatAm · Europa
            </span>

            <h1 className="font-display text-[2.75rem] xs:text-[3.5rem] sm:text-[5rem] md:text-[6rem] lg:text-[6rem] xl:text-[7rem] font-black uppercase leading-[0.85] tracking-tight mb-8">
              <m.span
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="block text-white"
              >
                CONECTAMOS
              </m.span>
              <m.span
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
                className="block hero-headline-gradient"
              >
                CREADORES
              </m.span>
              <m.span
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                className="block text-white"
              >
                CON MARCAS
              </m.span>
            </h1>

            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="text-base sm:text-lg text-sp-muted2 mb-6 leading-relaxed font-medium max-w-xl"
            >
              Campañas gaming y iGaming con talentos verificados, compliance
              integrado y FTDs rastreados. 13+ años ejecutando en España, LatAm
              y Europa.
            </m.p>

            <HeroStats />

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <m.a
                href="/contacto"
                onClick={() => trackEvent('cta_click', { cta_id: 'hero_home_primary', cta_destination: '/contacto' })}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(224,48,112,0.3)' }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase transition-shadow bg-sp-grad text-center"
              >
                Tengo una marca →
              </m.a>
              <m.a
                href="/para-creadores"
                onClick={() => trackEvent('cta_click', { cta_id: 'hero_home_creators', cta_destination: '/para-creadores' })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase border border-white/10 backdrop-blur-sm transition-colors hover:bg-white/10 text-center"
              >
                Soy creador →
              </m.a>
            </m.div>

            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-sp-muted2/80"
            >
              Respuesta en 24h · Sin compromiso
            </m.p>
          </div>

          {/* Columna derecha — live tile */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex justify-center lg:justify-end"
          >
            <HeroLiveTile />
          </m.div>
        </div>
      </div>
    </section>
  );
}
```

Cambios respecto al original:
- Quitado `Image` import y bloque del logo X centrado.
- Quitado `HERO_STATS` const local y bloque `mt-20 flex gap-12` final.
- Header del contenedor pasa a grid `[1fr_360px]` en lg con stack en mobile.
- Wrapper del hero en `items-center` (antes era `items-center justify-center text-center`); el text-align pasa a `text-left` en cada columna.
- Aura pink desplazada de centro a `left-0` para que no laven la columna derecha.
- Importa y monta `<HeroStats />` y `<HeroLiveTile />`.
- Deleted `pb-20` reduced to `pb-16 lg:pb-0` para no dejar tanto espacio al fondo.

- [ ] **Step 2: Run typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- src/features/marketing-site/components/Hero.tsx
```

Expected: both pass.

- [ ] **Step 3: Smoke test in browser**

```bash
npm run dev
```

Verifica `http://localhost:3000/`:
- **Desktop ≥1024px:** layout asimétrico — type a la izquierda, tile a la derecha. Logo X ya no aparece. Stats `13+ AÑOS · 15M VIEWS/MES · 340 FTDS` visibles arriba de los CTAs, en una sola fila.
- **Mobile <1024px:** stack vertical — type primero, tile (mosaico o featured) después.
- **Estado del tile:** según haya alguien live o no, cambia entre featured (thumbnail + LIVE pulse + viewer count) y mosaico 3×2 del roster.
- **Click `+N más en directo →` o `Síguelos en Twitch →`:** ancla a `#en-directo`, scrollea a la sección live.
- **Reduce motion:** activar en DevTools (`Rendering > Emulate prefers-reduced-motion`) y verificar que el pulse no anima.

- [ ] **Step 4: Commit**

```bash
scripts/committer "feat(hero): asymmetric layout with live tile and inline stats" \
  src/features/marketing-site/components/Hero.tsx
```

---

## Task 9: Final verification

**Files:**
- (no files modified)

- [ ] **Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS, sin errores.

- [ ] **Step 2: Run full lint**

```bash
npm run lint
```

Expected: PASS, sin nuevos warnings.

- [ ] **Step 3: Run unit tests**

```bash
npm test -- --selectProjects client
```

Expected: PASS, incluyendo los 8 tests de `live-format.test.ts`.

- [ ] **Step 4: LCP regression check**

Con `npm run dev` corriendo:

```bash
# En otra terminal
npx lighthouse http://localhost:3000 --only-categories=performance --form-factor=desktop --output=json --output-path=/tmp/lh-after.json --quiet --chrome-flags="--headless"
```

Lee el LCP value:

```bash
node -e "const r=require('/tmp/lh-after.json'); console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);"
```

Expected: LCP ≤ 2.5s (target del spec). Si supera, investigar si el thumbnail del tile compite con el H1 por LCP.

- [ ] **Step 5: Manual visual checklist**

En el navegador, sin DevTools abierto:

- [ ] Hero desktop muestra grid 60/40 sin scroll, type izquierda + tile derecha.
- [ ] Hero móvil (DevTools, modo iPhone 14): stack vertical limpio, tile compacto debajo, todo legible sin scroll horizontal.
- [ ] Estado A (si hay live): pulse rojo, viewer count, thumbnail, badge juego, link a stream funciona.
- [ ] Estado B (si nadie live): mosaico 3×2 con caras nítidas, hover suave, link `#en-directo` ancla bien.
- [ ] Reduce motion: animaciones de entrada y pulse desactivadas.
- [ ] Logo X grande desaparecido del hero.
- [ ] Sin errores en consola.

- [ ] **Step 6: Final commit (si hubo ajustes manuales)**

Si los pasos manuales requirieron tweaks (paddings, tamaños, etc.), commitea por separado:

```bash
scripts/committer "fix(hero): visual polish post-smoke-test" \
  src/features/marketing-site/components/Hero.tsx \
  src/features/marketing-site/components/HeroLiveTile.tsx
```

Si no hubo cambios, salta este paso.

---

## Self-review checklist (executed during plan writing)

**Spec coverage:**
- ✅ Layout desktop ≥lg con grid `[1fr_360px]` → Task 8
- ✅ Stack vertical en mobile/tablet → Task 8 (`grid-cols-1 lg:grid-cols-[1fr_360px]`)
- ✅ Logo X eliminado → Task 8
- ✅ H1 reescalado a `text-[6rem]` en lg → Task 8
- ✅ Stats inline arriba de CTAs → Task 7 + Task 8
- ✅ Estado A live featured con thumb + viewers + game → Task 5
- ✅ Estado B mosaico 3×2 del roster → Task 6
- ✅ Loading skeleton → Task 4
- ✅ Estado C (data null) retorna null → Task 4
- ✅ `useLiveData` hook compartido → Task 2
- ✅ `live-format` con `formatViewers` y `gameBadge` → Task 1
- ✅ Ancla `#en-directo` en LiveSection → Task 3
- ✅ Telemetry `cta_click` con `hero_live_tile_featured` y `hero_live_tile_roster_card` → Tasks 5 y 6
- ✅ Auras desplazadas para no lavar columna derecha → Task 8 (aura pink a `left-0`)
- ✅ Aceptación: tsc + lint + LCP ≤2.5s → Task 9

**Placeholder scan:** sin TBD, sin "implement later", sin "similar to task N", todo el código está escrito en cada step.

**Type consistency:**
- `LiveData` definido en `useLiveData.ts` (Task 2), reutilizado en `HeroLiveTile.tsx` (Tasks 4–6) vía el hook.
- `LiveTalent` y `TwitchRosterEntry` se importan desde `@/lib/queries/live` (existente).
- `formatViewers(n: number | null): string` y `gameBadge(game: string): string` consistentes en Task 1 y consumidores Tasks 5–6.
