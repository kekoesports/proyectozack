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
