# Agency videos on the homepage

The approved section sits after case studies and before the contact CTA. It keeps
the existing visual style and offers one featured TikTok with a three-post
playlist. This is a curated selection, not an automatically refreshed account feed.
Change the list and editorial labels in `src/lib/agency-videos.ts`.

## Loading and privacy

The server fetches official oEmbed metadata in parallel with a four-second timeout
and hourly revalidation. Thumbnail hosts are validated against the official CDN
allowlist; Next Image serves them through the same-origin optimizer. Signed
thumbnail URLs are refreshed rather than committed. Metadata failure preserves
the titles, playlist and original-video links.

The iframe requires marketing consent and at least 45% visibility. Activating
videos preserves the separate analytics preference. Revoking consent, hiding the
tab or leaving the viewport unmounts the iframe. Returning starts a fresh muted
player. Reduced-motion users receive manual playback. Sound changes reload the
player because TikTok's `muted=1` option locks its native volume control.

TikTok postMessages are checked for the exact origin, source window and Zod
payload. Native controls remain available; player errors and readiness timeouts
offer the original TikTok link. The CSP adds only the official player origin.

## Verification — 2026-09-10

- Eight focused client/server tests cover consent, visibility, tab hiding,
  revocation, playlist replacement, reduced motion, sound, forged messages,
  provider errors, metadata availability and invalid thumbnail hosts.
- TypeScript and ESLint checks pass (one pre-existing PnL navigation lint warning).
- Drizzle metadata check passes with a synthetic, unreachable database URL.
- The actual Next.js component was browser-tested on an isolated temporary route,
  with synthetic environment values and no database connection. Official oEmbed
  metadata and the same-origin image optimizer were real; four thumbnails loaded.
- Browser checks confirmed no player before consent or after rejection, one
  player after activation, and no player after scrolling to cookie preferences.
- Current-session TikTok playback verification is limited: both the integrated
  player and the unchanged approved static prototype failed to receive readiness
  from TikTok. A plain isolated iframe behaved the same. Removing CSP temporarily
  for diagnosis did not change that; the full policy was restored before commit.
  Actual playback had been observed in the earlier approved preview, but that is
  not reported as a fresh playback pass for this integration.
- Temporary review routes and diagnostic configuration are excluded from the commit.

Implemented: yes. Tested: component behavior and browser UI, with the external
playback limitation above. Active: homepage integration in code; pushing master
does not itself establish a VPS deployment. Functioning: verified selection,
images, consent and pause; current external playback remains unconfirmed.

The publication worktree was based on current `origin/master`, preserving unrelated
CRM work in the original checkout. No migrations, CRM mutations, messages or
production deployment are part of this change. The pre-push press-sync hook must
run without database configuration; never provide it production credentials.

Reference: https://developers.tiktok.com/docs/en/embed-player
