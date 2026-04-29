"""
Instagram profile enricher via Firecrawl.

For each candidate handle, scrapes instagram.com/<handle> and extracts:
  - followers count
  - full name
  - bio
  - is_verified
  - is_private (page signals)
  - external URL

Returns an enriched DiscoveredProfile, or None if the account doesn't exist,
is private, or has followers outside the configured range.
"""
import logging
import re
import time

from scraper.models import DiscoveredProfile

log = logging.getLogger(__name__)

# ── Follower count extraction ─────────────────────────────────────────────────
# Instagram embeds follower count in multiple places in the rendered HTML.
# We try several patterns in priority order.
_FOLLOWER_PATTERNS = [
    # JSON-LD / meta content: "12.3K Followers"
    re.compile(r'"([0-9,.]+[KkMmBb]?)\s*[Ff]ollowers"'),
    # og:description: "1,234 Followers, 567 Following, 89 Posts"
    re.compile(r'([\d,]+)\s+Followers'),
    # Abbreviated: "12.3K followers" in page text
    re.compile(r'([\d,.]+[KkMmBb]?)\s+followers', re.IGNORECASE),
    # Compact form in JSON: "follower_count":12345
    re.compile(r'"follower_count"\s*:\s*(\d+)'),
    # edge_followed_by: {"count": 12345}
    re.compile(r'"edge_followed_by"\s*:\s*\{"count"\s*:\s*(\d+)\}'),
]

_FOLLOWING_PATTERNS = [
    re.compile(r'([\d,]+)\s+Following'),
    re.compile(r'"following_count"\s*:\s*(\d+)'),
    re.compile(r'"edge_follow"\s*:\s*\{"count"\s*:\s*(\d+)\}'),
]

_POSTS_PATTERNS = [
    re.compile(r'([\d,]+)\s+[Pp]osts?'),
    re.compile(r'"media_count"\s*:\s*(\d+)'),
    re.compile(r'"edge_owner_to_timeline_media"\s*:\s*\{"count"\s*:\s*(\d+)\}'),
]

_NAME_PATTERNS = [
    re.compile(r'"full_name"\s*:\s*"([^"]{2,80})"'),
    re.compile(r'<title>([^<(]{2,60})\s*(?:\([^)]*\))?\s*[•·]\s*Instagram'),
]

_BIO_PATTERNS = [
    re.compile(r'"biography"\s*:\s*"([^"]{5,300})"'),
]

_URL_PATTERNS = [
    re.compile(r'"external_url"\s*:\s*"(https?://[^"]{4,200})"'),
]

_VERIFIED_PATTERNS = [
    re.compile(r'"is_verified"\s*:\s*(true|false)'),
]

_PRIVATE_PATTERNS = [
    re.compile(r'"is_private"\s*:\s*(true|false)'),
]


def _parse_count(raw: str) -> int:
    """Convert '12.3K', '1,234', '1.2M' etc. to int."""
    raw = raw.strip().replace(",", "")
    try:
        if raw[-1].upper() == "K":
            return int(float(raw[:-1]) * 1_000)
        if raw[-1].upper() == "M":
            return int(float(raw[:-1]) * 1_000_000)
        if raw[-1].upper() == "B":
            return int(float(raw[:-1]) * 1_000_000_000)
        return int(float(raw))
    except (ValueError, IndexError):
        return 0


def _first_match(text: str, patterns: list[re.Pattern]) -> str | None:
    for pat in patterns:
        m = pat.search(text)
        if m:
            return m.group(1)
    return None


def enrich_profile(
    handle: str,
    firecrawl_client,
    config,
    existing: DiscoveredProfile | None = None,
) -> DiscoveredProfile | None:
    """
    Scrape instagram.com/<handle> via Firecrawl and return an enriched
    DiscoveredProfile, or None if the profile should be discarded.
    """
    url = f"https://www.instagram.com/{handle}/"
    log.debug("[enrich] scraping %s", url)

    try:
        result = firecrawl_client.scrape(url, formats=["markdown", "html"])
        # Use HTML for structured data extraction, markdown as fallback
        html = result.get("html") or ""
        text = html or result.get("markdown") or result.get("content") or ""
    except Exception as exc:
        log.warning("[enrich] failed to scrape @%s: %s", handle, exc)
        return None

    if not text or len(text) < 200:
        log.debug("[enrich] @%s returned empty/blocked page", handle)
        return None

    # Check for "Page Not Found" or private/removed account signals
    not_found_signals = [
        "Page Not Found", "Sorry, this page isn",
        "The link you followed may be broken",
    ]
    for sig in not_found_signals:
        if sig.lower() in text.lower():
            log.debug("[enrich] @%s — page not found", handle)
            return None

    # Extract followers
    raw_followers = _first_match(text, _FOLLOWER_PATTERNS)
    followers = _parse_count(raw_followers) if raw_followers else 0

    # Filter by follower range (only if we could extract the count)
    if followers > 0:
        if config.MIN_FOLLOWERS > 0 and followers < config.MIN_FOLLOWERS:
            log.debug("[enrich] @%s discarded — %d followers < min %d", handle, followers, config.MIN_FOLLOWERS)
            return None
        if config.MAX_FOLLOWERS > 0 and followers > config.MAX_FOLLOWERS:
            log.debug("[enrich] @%s discarded — %d followers > max %d", handle, followers, config.MAX_FOLLOWERS)
            return None
    else:
        # Could not read followers — keep the profile but with followers=0
        log.debug("[enrich] @%s — could not parse follower count, keeping", handle)

    # Extract other fields
    raw_following = _first_match(text, _FOLLOWING_PATTERNS)
    raw_posts = _first_match(text, _POSTS_PATTERNS)
    raw_name = _first_match(text, _NAME_PATTERNS)
    raw_bio = _first_match(text, _BIO_PATTERNS)
    raw_url = _first_match(text, _URL_PATTERNS)
    raw_verified = _first_match(text, _VERIFIED_PATTERNS)
    raw_private = _first_match(text, _PRIVATE_PATTERNS)

    is_private = (raw_private == "true") if raw_private else None
    if is_private:
        log.debug("[enrich] @%s is private, discarding", handle)
        return None

    base = existing or DiscoveredProfile(username=handle)
    base.followers = followers
    base.following = _parse_count(raw_following) if raw_following else None
    base.posts = _parse_count(raw_posts) if raw_posts else None
    base.full_name = raw_name or base.full_name
    base.bio = raw_bio or base.bio
    base.external_url = raw_url or base.external_url
    base.is_verified = (raw_verified == "true") if raw_verified else base.is_verified
    base.is_private = False  # we know it's public (we could read it)
    base.profile_url = url

    log.info(
        "[enrich] @%-25s followers=%-8s name=%s",
        handle,
        f"{followers:,}" if followers else "?",
        (raw_name or "")[:30],
    )
    return base


def enrich_batch(
    profiles: list[DiscoveredProfile],
    firecrawl_client,
    config,
    delay: float = 3.0,
) -> list[DiscoveredProfile]:
    """
    Enrich a list of candidate profiles.
    Returns only those that pass follower filter and exist publicly.
    """
    enriched: list[DiscoveredProfile] = []
    total = len(profiles)

    for i, profile in enumerate(profiles, 1):
        log.info("[enrich] %d/%d @%s", i, total, profile.username)
        result = enrich_profile(profile.username, firecrawl_client, config, existing=profile)
        if result:
            enriched.append(result)
        time.sleep(delay)

    log.info("[enrich] %d/%d profiles passed validation", len(enriched), total)
    return enriched
