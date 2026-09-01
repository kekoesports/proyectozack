# SocialPro — SEO Roadmap

> Last updated: 2026-04-03. Audit performed on socialpro.es full site.
> Execute phases in order — each phase unblocks the next.
> `site:socialpro.es` returns 1 result → low indexation is the current ceiling on all organic traffic.
> Read this file at the start of any SEO session before touching any code.

---

## Context & constraints

| Item | Detail |
|---|---|
| Framework | Next.js 16 App Router — metadata via `export const metadata` + `generateMetadata()` |
| Title template | `layout.tsx`: `template: '%s \| SocialPro'` — page titles must NOT include `\| SocialPro` or `— SocialPro` manually |
| Blog content | Stored in DB (`posts.body_md`). Edit via seed script or admin UI, not via code files |
| H1s | Hardcoded in component files under `src/components/sections/` |
| Talent metadata | Dynamic — generated from DB in `talentos/[slug]/page.tsx`. Fix the template bug; content comes from DB |
| Blog metadata | Dynamic — generated from DB in `blog/[slug]/page.tsx`. Same template bug |
| Commits | Conventional Commits via `git add` / `git commit` on named paths — never bare `git add .` |

---

## Phase SEO-1 — Fix title template bugs ✓ DONE

### Objective

`blog/[slug]/page.tsx` and `talentos/[slug]/page.tsx` both append `| SocialPro` inside the title string, which the root layout template then repeats: `"{title} | SocialPro | SocialPro"`. Fix both to produce a clean title.

### Files affected

| File | Current | Fix |
|---|---|---|
| `src/app/blog/[slug]/page.tsx:26` | `` const title = `${post.title} — Blog SocialPro`; `` | `` const title = post.title; `` |
| `src/app/talentos/[slug]/page.tsx:31` | `` const title = `${talent.name} — ${talent.role} \| SocialPro`; `` | `` const title = `${talent.name} — ${talent.role}`; `` |

### Step-by-step

1. In `blog/[slug]/page.tsx` line 26: remove `— Blog SocialPro` suffix. The template renders it as `"{post.title} | SocialPro"`.
2. In `talentos/[slug]/page.tsx` line 31: remove `| SocialPro` suffix. Template handles branding.
3. Run `npx tsc --noEmit` — clean.
4. Commit: `fix(seo): remove duplicate brand suffix from blog and talent title templates`

### Verification

- Open any `/blog/[slug]` page — browser tab must show `"{Post Title} | SocialPro"` (single brand).
- Open any `/talentos/[slug]` page — tab must show `"TODOCS2 — CS2 Pro Streamer | SocialPro"`.

---

## Phase SEO-2 — Rewrite thin page title tags ✓ DONE

### Objective

Five public pages have bare single-word titles (`'Servicios'`, `'Talentos'`, `'Casos de Éxito'`, `'Nosotros'`, `'Para Creadores'`). The root template renders these as e.g. `"Servicios | SocialPro"` — zero keyword value. Rewrite to keyword-rich titles within 50 chars (template adds `" | SocialPro"` = +12 chars, max 60 total).

### Files affected

| File | Current `title` | New `title` |
|---|---|---|
| `src/app/servicios/page.tsx:5` | `'Servicios'` | `'Agencia Marketing Gaming e iGaming'` |
| `src/app/talentos/page.tsx:8` | `'Talentos'` | `'Streamers y Creadores Gaming de Élite'` |
| `src/app/casos/page.tsx:8` | `'Casos de Éxito'` | `'Campañas Gaming — Resultados Reales'` |
| `src/app/nosotros/page.tsx:9` | `'Nosotros'` | `'Agencia Gaming España desde 2012'` |
| `src/app/para-creadores/page.tsx:8` | `'Para Creadores'` | `'Gestión y Patrocinios para Streamers'` |
| `src/app/blog/page.tsx` | `'Blog'` | `'Marketing Gaming — Insights y Tendencias'` |
| `src/app/contacto/page.tsx` | check + update | `'Contacta con Nuestra Agencia Gaming'` |
| `src/app/metodologia/page.tsx` | check + update | `'Metodología de Campañas Gaming'` |

### Step-by-step

1. Read each file listed above. Confirm current `title` value.
2. Replace `title` string with the new value from the table.
3. Verify char count: new title + ` | SocialPro` must be ≤ 60 chars.
4. Run `npx tsc --noEmit` — clean.
5. Commit: `fix(seo): rewrite thin page title tags with keyword-rich copy`

### Verification

- `curl -s https://socialpro.es/servicios | grep -o '<title>[^<]*</title>'` (after deploy) must show the new title.
- Or check locally with `npm run build && npm start`.

---

## Phase SEO-3 — Rewrite meta descriptions ✓ DONE

### Objective

Several meta descriptions are too short, truncated, or keyword-poor. Rewrite to 145–160 chars with a clear value proposition and implicit CTA.

### Files affected

| File | Current | New (≤ 160 chars) |
|---|---|---|
| `src/app/servicios/page.tsx:6–7` | 125-char truncated version | `'Campañas de influencer marketing gaming, gestión de talentos streamers y canales YouTube. Especialistas en iGaming y esports para el mercado hispano.'` |
| `src/app/talentos/page.tsx:9–11` | OK — review length | `'Roster exclusivo de streamers y creadores de contenido gaming en España y LatAm. CS2, Valorant, Twitch, YouTube. Más de 15M vistas mensuales.'` |
| `src/app/casos/page.tsx:9–11` | OK — review | `'Resultados reales: campañas con RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Así trabaja SocialPro con las marcas.'` |
| `src/app/nosotros/page.tsx:10–12` | missing geo keyword | `'SocialPro — agencia gaming fundada en Madrid en 2012 por ex-profesionales de esports. Especialistas en iGaming, CS2 y el ecosistema hispano.'` |
| `src/app/para-creadores/page.tsx` | OK — review | `'Únete al roster de SocialPro. Conseguimos patrocinios con las mejores marcas de iGaming, hardware y entretenimiento para streamers en España y LatAm.'` |

### Step-by-step

1. Read each file. Check current description length.
2. Replace description with new copy from table.
3. `npx tsc --noEmit` — clean.
4. Commit: `fix(seo): expand keyword-thin meta descriptions across public pages`

---

## Phase SEO-4 — H1 keyword optimization ✓ DONE

### Objective

Several H1s are keyword-free ("Qué hacemos", "Talentos en activo"). Find the component files where these are hardcoded and update the copy. Do not change visual styling — only the text content.

### Investigation needed first

Run `grep -rn 'Qué hacemos\|Talentos en activo\|Casos de Éxito\|Somos la agencia' src/components/sections/` to locate the exact files and line numbers, then edit.

### Known targets

| Current H1 | Target page | New H1 copy |
|---|---|---|
| `"Qué hacemos"` | `/servicios` | `"Servicios de Marketing Gaming e iGaming"` |
| `"Talentos en activo"` | `/talentos` | `"Streamers y Creadores Gaming en España y LatAm"` |
| `"Casos de Éxito"` | `/casos` | `"Campañas Gaming con Resultados Medibles"` |

Note: Homepage H1 `"CONECTAMOS CREADORES CON MARCAS"` is intentional brand copy — acceptable. Do not change it.
Note: `/nosotros` H1 `"Somos la agencia gaming del mercado hispano"` — already good.

### Step-by-step

1. Run the grep above to find exact files + line numbers.
2. Edit the H1 text strings. Preserve all className attributes unchanged.
3. `npx tsc --noEmit` — clean.
4. `npm run lint` — clean.
5. Commit: `fix(seo): update keyword-free H1s on servicios, talentos, casos pages`

---

## Phase SEO-5 — Fix blog post author schema ✓ DONE

### Objective

`blog/[slug]/page.tsx` line 68 hardcodes `author: { '@type': 'Organization', name: 'SocialPro' }`. The DB `posts` table has an `author` text field (used in `<SectionTag>{post.author}</SectionTag>`). Use it in the schema to signal a named Person, improving E-E-A-T.

### Files affected

`src/app/blog/[slug]/page.tsx` lines 63–73.

### Change

```ts
// Before
author: { '@type': 'Organization', name: 'SocialPro' },
publisher: { '@type': 'Organization', name: 'SocialPro' },

// After
author: {
  '@type': 'Person',
  name: post.author,
  worksFor: { '@type': 'Organization', name: 'SocialPro' },
},
publisher: { '@type': 'Organization', name: 'SocialPro' },
```

### Step-by-step

1. Read `src/app/blog/[slug]/page.tsx`.
2. Apply the change above. `post.author` is already in scope at that point.
3. `npx tsc --noEmit` — clean.
4. Commit: `fix(seo): use named person author schema in blog posts for E-E-A-T`

---

## Phase SEO-6 — Expand blog post content ✓ DONE

### Objective

All 4 published blog posts have ~300 words each — far below the 1,200–1,500 words needed to rank for competitive informational queries. Expand each to 1,200+ words minimum.

### Blog posts to expand (slugs from sitemap)

| Slug | Current words (est.) | Target |
|---|---|---|
| `tendencias-gaming-espana-2025` | ~300 | 1,400 |
| `guia-creadores-conseguir-sponsor` | ~300 | 1,600 |
| `caso-exito-campana-gaming-hardware` | ~300 | 1,200 |
| `tendencias-gaming-latam-2026` | ~300 | 1,400 |

### Approach

Blog body content is stored in `posts.body_md` in the DB. To update:
1. Create a script `scripts/seeds/blog/expand-posts.ts` that calls `db.update(posts).set({ bodyMd: ... })` for each slug.
2. Write the expanded content in Markdown — use `## Heading` for H2s, `### Subheading` for H3s (the blog renderer already handles these).
3. Each expanded post must include: introduction (problem + promise), 4–6 H2 sections, concrete examples or data, internal links to `/servicios` and `/talentos`, and a final CTA paragraph.

### Content briefs

**`tendencias-gaming-espana-2025`** — expand with: ES market size (2,400M€), Twitch vs YouTube engagement data, iGaming compliance changes 2025, CS2 boom in Hispanic market, brand ROI benchmarks. Target keyword: "marketing gaming España 2025".

**`guia-creadores-conseguir-sponsor`** — expand with: how to prepare a media kit, what brands look for in a gaming creator (engagement vs followers), types of deals (CPA, flat fee, revenue share), iGaming-specific requirements, step-by-step application process. Target keyword: "cómo conseguir patrocinios streaming".

**`caso-exito-campana-gaming-hardware`** — expand with: full RAZER campaign breakdown, creator selection criteria, activation timeline, reach vs engagement metrics, what made it work, lessons for other hardware brands. Target keyword: "caso de éxito campaña gaming influencers".

**`tendencias-gaming-latam-2026`** — expand with: LatAm market size per country (MX, AR, CO, CL), platform distribution, CS2 scene growth, iGaming regulation differences vs Spain, FTD benchmarks. Target keyword: "gaming LatAm 2026 tendencias".

### Step-by-step

1. Write each expanded post body (Markdown, 1,200+ words).
2. Create `scripts/seeds/blog/expand-posts.ts` with one `db.update()` per post.
3. Run `npx tsx scripts/seeds/blog/expand-posts.ts`.
4. Verify on `/blog/[slug]` — body renders with H2 headings and paragraph structure.
5. Commit: `content(blog): expand 4 posts to 1200+ words for keyword ranking`

---

## Phase SEO-7 — New landing page: /servicios/igaming ✓ DONE

### Objective

iGaming is SocialPro's most defensible niche. No competitor has a dedicated landing page for this. Create `/servicios/igaming` as a standalone SEO landing page targeting "agencia igaming España", "marketing igaming influencers", "campañas igaming streamers".

### Files to create

| File | Purpose |
|---|---|
| `src/app/servicios/igaming/page.tsx` | Server Component page with metadata + content |
| (optional) `src/components/sections/iGamingServicesSection.tsx` | Section component if content is complex |

### Page structure

- **Metadata**: `title: 'Agencia de Campañas iGaming España'`, description: 155-char targeting "marketing igaming España", "streamers igaming", canonical: `/servicios/igaming`
- **H1**: `"Campañas iGaming con Streamers que Convierten"`
- **Sections**:
  1. Hero: value proposition + key stat (340+ FTDs, avg CPA metrics)
  2. Why iGaming is different: regulatory complexity, compliance, disclaimers — SocialPro's expertise
  3. Our process: creator vetting → briefing → legal review → activation → FTD tracking
  4. Case studies: 1WIN (8M reach, 100+ influencers), SkinsMonkey (200K€ tracked conversions)
  5. Compliance section: what Spain's gambling regulation requires from streaming sponsors
  6. CTA: "Lanza tu campaña iGaming"
- **Schema**: Add `Service` schema with `serviceType: 'iGaming Influencer Marketing'`, `areaServed: Spain + LatAm`
- **Internal links**: Link from `/servicios` page intro section + from homepage Services section

### Step-by-step

1. Read `src/app/servicios/page.tsx` and `src/components/sections/ServicesSection.tsx` for patterns.
2. Create `src/app/servicios/igaming/page.tsx` with full content.
3. Add link to the new page from `/servicios` (ServicesSection component).
4. Update `src/app/sitemap.ts` to include `/servicios/igaming`.
5. `npx tsc --noEmit` — clean.
6. Commit: `feat(seo): add dedicated /servicios/igaming landing page`

---

## Phase SEO-8 — New blog posts: content gap coverage ✓ DONE

### Objective

Publish 3 high-priority posts targeting the most valuable content gaps identified in the SEO audit.

### Posts to create (priority order)

**Post 1 — "Regulaciones iGaming España: guía para streamers y creadores"**
- Target keyword: `regulación igaming España streamers`
- Slug: `regulaciones-igaming-espana-streamers`
- Intent: Informational (brand awareness + creator acquisition)
- Word count: 1,500
- Key sections: qué es iGaming legal en España, qué puede decir un streamer (disclaimers), qué no está permitido, diferencias España vs LatAm, cómo gestiona SocialPro el compliance
- Internal links: `/servicios/igaming`, `/para-creadores`
- **Note: have legal review this post before publishing** — flag `status: 'draft'` until approved

**Post 2 — "Guía completa de marketing gaming en España 2026"**
- Target keyword: `marketing gaming España 2026`
- Slug: `guia-marketing-gaming-espana-2026`
- Intent: Informational (top-of-funnel for brands)
- Word count: 2,000 (pillar post — links out to all other posts)
- Key sections: estado del mercado, plataformas (Twitch vs YouTube vs TikTok), tipos de campaña, métricas que importan, cómo elegir agencia, errores comunes
- Internal links: all existing posts, `/servicios`, `/casos`

**Post 3 — "Cómo monetizar tu canal de YouTube gaming en 2026"**
- Target keyword: `monetizar canal youtube gaming`
- Slug: `monetizar-canal-youtube-gaming-2026`
- Intent: Informational (creator acquisition funnel)
- Word count: 1,400
- Key sections: AdSense vs sponsorships vs memberships, cómo preparar un media kit, qué buscan las marcas, el papel de una agencia de representación, caso real
- Internal links: `/para-creadores`, `/talentos`

### Approach

Same as Phase SEO-6: write content, insert into DB via seed script `scripts/seeds/blog/new-posts.ts`, publish with `status: 'published'`.

### Step-by-step

1. Write the 3 posts in Markdown.
2. Create `scripts/seeds/blog/new-posts.ts` — insert into `posts` table via Drizzle.
3. Run `npx tsx scripts/seeds/blog/new-posts.ts`.
4. Verify each post renders at `/blog/[slug]`.
5. Update sitemap if it's statically generated.
6. Commit: `content(blog): publish 3 new SEO posts covering igaming, marketing gaming, youtube monetization`

---

## Phase SEO-9 — Open Graph images ⬜ TODO

### Objective

Most pages have no OG image defined — social shares render blank. Add OG images to all key public pages. Do not generate images dynamically yet (avoid complexity) — use static assets.

### Files affected

`src/app/layout.tsx` — root OpenGraph block.
Each public `page.tsx` that defines its own `openGraph` block.

### What to do

1. Create a default OG image at `public/og-default.jpg` (1200×630px) — can be a screenshot of the site or a branded card. **This requires a human to create the image asset first.**
2. Once the asset exists, add to root `metadata.openGraph`:
   ```ts
   images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'SocialPro — Agencia Gaming & Esports' }],
   ```
3. For blog posts: already dynamic via `post.coverUrl` — ensure all published posts have a cover image in the DB.
4. For talent pages: already dynamic via `talent.photoUrl`.

### Constraint

Step 1 (creating the image) is manual. Steps 2–4 are automatable once the asset exists.

---

## Phase SEO-10 — Hreflang for Spain / LatAm ✓ DONE

### Objective

SocialPro serves Spain (ES) and LatAm (ES-419) with the same Spanish content. No hreflang tags currently exist. Add them to signal to Google which content targets which region.

### Constraint

This is only meaningful if content diverges between regions. If both regions see identical pages, add `x-default` + `es` only. If LatAm-specific pages are created later, expand to `es-MX`, `es-AR`, etc.

### Change

In `src/app/layout.tsx` `metadata` object, add:

```ts
alternates: {
  canonical: '/',
  languages: {
    'es': `${SITE_URL}`,
    'x-default': `${SITE_URL}`,
  },
},
```

Each page-level `alternates` block already sets `canonical` — keep those. The root sets the global fallback.

### Step-by-step

1. Read `src/app/layout.tsx`.
2. Add `languages` to the existing `alternates` block.
3. `npx tsc --noEmit` — clean.
4. Commit: `feat(seo): add hreflang tags for es and x-default in root layout`

---

## Phase SEO-11 — External: Google Search Console & monitoring ⬜ MANUAL

These steps require human access and cannot be automated by Claude.

### Checklist

- [ ] Submit `https://socialpro.es/sitemap.xml` to Google Search Console
- [ ] Request indexation for the 5 main pages (Homepage, Talentos, Servicios, Casos, Nosotros)
- [ ] Run PageSpeed Insights on homepage + `/talentos` — fix any LCP or CLS issues found
- [ ] Validate structured data via Google Rich Results Test for: FAQPage (homepage), BlogPosting (any post), Person (any talent), Organization (homepage)
- [ ] Set up weekly GSC report — check for coverage errors, new indexed pages, CTR by query
- [ ] Verify `google0a2e5f57d02c6826.html` in `/public` is still valid (already present — good)

---

## Phase SEO-12 — Linkbuilding ⬜ MANUAL + ONGOING

High-impact but requires human outreach. Prioritize by domain authority of the target site.

### Targets (prioritized)

| Target | Type | Approach |
|---|---|---|
| Vandal.net | Gaming media ES | Pitch press coverage of a campaign result or agency news |
| 3DJuegos.com | Gaming media ES | Op-ed or interview with team about iGaming trends |
| Meristation.com | Gaming media ES | News piece on a talent signing or notable campaign |
| Xataka.com | Tech/gaming ES | Contribute expert quote to a streaming/creator economy article |
| InfluencerMarketingHub.com | Marketing global | Submit for inclusion in "Top Gaming Agencies Spain" articles |
| ESIC.edu | Academic ES | Guest post on gaming marketing for their Rethink blog |
| Twitch creator directories | Aggregators | List SocialPro in agency directories and talent marketplaces |

### Internal prerequisite

Do Phases SEO-1 through SEO-5 before starting outreach. Pages must be keyword-optimized for backlinks to carry full weight.

---

## Summary — Execution order

| Phase | Action | Type | Effort |
|---|---|---|---|
| SEO-1 | Fix title template double-brand bug | Code | ✓ DONE |
| SEO-2 | Rewrite page title tags | Code | ✓ DONE |
| SEO-3 | Rewrite meta descriptions | Code | ✓ DONE |
| SEO-4 | H1 keyword fixes | Code | ✓ DONE |
| SEO-5 | Blog author schema | Code | ✓ DONE |
| SEO-6 | Expand 4 blog posts to 1200+ words | Content + DB | ✓ DONE |
| SEO-7 | New /servicios/igaming page | Code + Content | ✓ DONE |
| SEO-8 | 3 new blog posts | Content + DB | ✓ DONE (regulaciones in draft — needs legal review) |
| SEO-9 | OG images | Asset + Code | ⬜ Blocked on image asset |
| SEO-10 | Hreflang tags | Code | ✓ DONE |
| SEO-11 | GSC submission + monitoring | Manual | 30 min |
| SEO-12 | Linkbuilding outreach | Manual + Ongoing | Weeks |
