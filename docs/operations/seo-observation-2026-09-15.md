# Public SEO changes and observation window — 2026-09-15

Scope: improve the Twitch landing with existing public creator photographs and
brand evidence; repair public crawl endpoints on KekoPilot and LIVE; update the
Maps phone. Preserve the published design and hold other SEO changes until the
October review. No production schema or lead-data changes.

## Implemented boundaries

- Twitch uses the existing public roster query (published, listed, not archived),
  excludes inactive creators and requires a Twitch social profile and photograph.
  It renders at most six cards on the server. Internal CRM fields are never passed
  to a new client component. Razer is shown only while its case is published.
- Removed unsupported hero statistics and the fixed 48-hour proposal promise.
  Visible FAQ answers and FAQ structured data share a single definition.
- `infra/public-seo/caddy-seo.py` adds exact robots/sitemap handlers only to
  `kekopilot.com` and `live.socialpro.es`. The public URLs are KekoPilot `/` and
  `/en`, plus LIVE `/`. Existing redirects, private hosts and proxy handlers stay
  intact. No fabricated last-modified dates or extra domains are added.
- Google Business saved phone **+34 684 48 35 95**. The business account still
  reports **verification required**. Saving is not proof of public publication.
  Google says business information errors must be corrected before verification.
- Keydrop's existing case already contains a creator section with photographs.
  The bonus/deposit acquisition page is outside the implementation delivered here;
  it has not been enhanced or silently replaced with a different campaign.

## Verification and deployment

Local: TypeScript, scoped ESLint, Drizzle metadata check and five isolated proxy
regression tests. The proxy candidate was also accepted by the running Caddy
version using `--check`; this mode leaves live configuration unchanged.

The Python tests verify existing configuration preservation (including the private
app), handler order ahead of the deny route, duplicate/missing-host rejection and
exact public sitemap membership. They do not assert deployment success.

The deployment helper validates before writing, stores a private backup, preserves
the bind-mounted inode, reloads Caddy and verifies public content types, bodies,
XML and landing responses. It restores the previous configuration on failure.
It changes no database and does not restart the application containers.

Use the normal isolated web-image build and read-only candidate journey for
Twitch. Current runtime receipts and browser evidence belong in
`.scratch/seo-improvements-20260915/verification.md`; do not infer activation from
this implementation document or a green build alone.

## October checkpoint

The existing morning GitHub/Zack heartbeat retains its schedule and read-only
security scope. A single SEO checkpoint was appended for **15 October 2026** (or
the first run afterward), with a completion marker to prevent repeated reports.

Baseline GSC 16 August–12 September: 257 clicks, 18,985 impressions, CTR 1.4%,
average position 9.6. Twitch: 7 clicks/4,798 impressions; Keydrop: 115/2,433.
Compare equal 28-day windows. The 3,500 target is provisionally **total monthly
website visits**; organic clicks are a different measure. Report missing analytics
access rather than inventing progress. The checkpoint authorizes a report, not
automatic publishing, spending or further SEO edits.
