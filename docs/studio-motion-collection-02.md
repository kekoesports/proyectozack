# Creator Studio · Motion Collection 02

Read when: editing the template gallery, offline renderer, or release of new motion IDs.

## Product contract

Ten active, independently composed designs in `/studio/templates`: editorial, steps, contact,
comparison, checklist, focal message/data, community question, live agenda, timeline and quote.
Every new design embeds the bundled SocialPro logo and keeps a small SocialPro footer.
Text, duration, light/dark palette and 9:16 / 1:1 / 16:9 format remain editable.
No arbitrary HTML, remote fonts, media URLs or scripts can be submitted to the renderer.

Legacy `statement-v1`, `steps-v1`, `contact-v1` remain available and retain their original HTML.
New editorial/steps/contact variants use v2; the seven other designs start at v1. Persisted JSONB
boards and immutable render snapshots do not need a database migration. Never repurpose a
version already used by a saved board; create a new version when changing that composition.

## Creator journey

1. Sign in at `app.socialpro.es`; agency users choose the creator workspace.
2. Plantillas: browse actual rendered posters; click Ver for an offline sandboxed animation.
3. Create/open a project → Montaje. Add a Collection 02 example sequence, or choose one of
   the ten designs for an individual title scene. Adding never replaces existing scenes.
4. Adapt text, insert owned images/clips and optionally select an uploaded narration.
5. Save → Export MP4 → Review and download the private result.

The gallery loads one animation on demand, not ten background renderers. Poster files are
screenshots of the exact same trusted HTML used for MP4 export. Preview actions require the
existing creator/agency guard; project previews also require access to the requested project.

## Low-cost examples

Three reproducible, public editorial samples cover every new design:

| File under `public/motion/collection-02/` | Duration | Content |
| --- | --- | --- |
| gaming-clip.mp4 | 15 s | Context → play → community question |
| brief-claro.mp4 | 20 s | One objective → useful brief → checklist → contact |
| despues-del-live.mp4 | 15 s | Live agenda → reuse workflow → editorial takeaway |

These are silent motion graphics, not AI avatar demos. They contain no customer data,
invented metrics, copyrighted third-party music, personal likenesses or cloned voices.
No database writes or AI/provider calls are involved in building these samples. CPU/server
processing is not free infrastructure, but it consumes zero Higgsfield credits.

Current offline capabilities: animated text/branding, ordered clips, full-image contain fit,
trimming, a supplied narration, fades and 720p exports in three aspect ratios. This path does
not generate faces, speech, lip sync, new gameplay, automatic licensed music or social posts.
Those capabilities must not be described as already included in these templates.

## Reproduction and checks

Use the existing pinned HyperFrames 0.8.30, Chromium, FFmpeg and bundled OFL fonts.
`scripts/test-studio-motion-layout.ts --posters` checks 10 × 3 formats × 2 palettes × 2 text
lengths and generates posters. `scripts/render-studio-examples.ts` generates the three MP4s.
Both are offline. For the render script, use the worker preload and a dummy DATABASE_URL;
do not load production credentials. `scripts/test-studio-motion.ts` exercises native export
in all three formats. Only fixed public sample outputs belong in the repository.

Release the backward-compatible worker image (including the logo file) before exposing the
new web IDs. Test save → queued snapshot → worker → private MP4 with an isolated fixture.
Keep existing production users, projects, permissions, database and private storage unchanged.

## Verified release · 2026-09-06

- Source `fc5e11636fca22790d52dab705ee0e501e198095`, PR #450 merged as
  `7e74255e8f8d17d7931263d6fda3776614654c5e`. All four GitHub checks passed.
- TypeScript and affected lint passed; 6,414 unit tests passed (one pre-existing skipped),
  then 73 targeted boundary tests after adding two static-host cases. All 120 layout checks
  passed, including logo loading, animation, readable text and safe margins.
- Native HyperFrames/FFmpeg exports verified in three formats. The three public samples play
  at 720×1280 with durations 15.021 / 20.021 / 15.021 s and no playback errors.
- Isolated browser: ten loaded posters, one sandboxed preview on demand, no page errors or
  horizontal overflow at 1440 and 390 px. Added a three-scene sequence, retained the original
  scene, edited its title, saved and exported. New Linux worker returned a private 19.021 s
  MP4, decoded in the authenticated browser. Fixture identity and project scope verified;
  another creator remains unable to access private assets.
- Production aggregate counts unchanged: 148 talents, 8 users, zero creator memberships,
  zero Studio projects/renders and zero fixture records. No production test projects created.
- Live web: `socialpro-studio-motion-web-1`, image `socialpro:studio-motion-fc5e1163`,
  Docker image `sha256:543cd64452c48962a8b4cbef78cf85712625134534802fd739affabc7fe82397`.
- Live offline worker: `socialpro-studio-render-1`, image `socialpro-studio-worker:fc5e1163`,
  Docker image `sha256:90153a326bdb4f1484fd0243d92a58924aa0eadc43dc637968e062d8414c816f`.
- Production media HEAD: 200, video/mp4, expected byte lengths; range request: 206.
  Creator Studio remains on app.socialpro.es; canonical CRM remains on socialpro.es.
- Rollback: retained native web `socialpro-studio-native-web-1`; guarded private Caddy backups
  `Caddyfile.before-motion` / `Caddyfile.with-motion` in the existing release directory. Keep
  the new backward-compatible worker if any new-design boards/jobs exist; do not downgrade it
  while those jobs could still run. No database migration or data rollback is involved.
