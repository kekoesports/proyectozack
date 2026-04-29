"""
Reddit public JSON API → extract @handles and instagram.com URLs from posts/comments.
Uses Reddit's public .json endpoint — no auth needed, no Firecrawl needed.
"""
import logging
import re
import time

import requests

from scraper.models import DiscoveredProfile

log = logging.getLogger(__name__)

_IG_URL_RE = re.compile(
    r'instagram\.com/([A-Za-z0-9_.]{3,30})(?:/|\b)',
    re.IGNORECASE,
)
_IG_HANDLE_RE = re.compile(r'@([A-Za-z0-9_.]{3,30})')
_IGNORED_IG = {"p", "reel", "stories", "explore", "direct", "accounts", "sharedfiles"}

_HEADERS = {
    "User-Agent": "SocialProScraper/1.0 (contact: admin@socialpro.es)",
}

# Reddit public JSON search endpoints (no auth, rate limited to ~1 req/s)
_SEARCH_QUERIES: list[tuple[str, str]] = [
    # (url, niche)
    ("https://www.reddit.com/r/GlobalOffensive/search.json?q=instagram&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/csgo/search.json?q=instagram&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/ValorantCompetitive/search.json?q=instagram&sort=top&t=year&limit=100", "valorant"),
    ("https://www.reddit.com/r/VALORANT/search.json?q=instagram+streamer&sort=top&t=year&limit=100", "valorant"),
    ("https://www.reddit.com/r/gambling/search.json?q=instagram+streamer&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/OnlineCasinos/search.json?q=instagram&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/CryptoCurrency/search.json?q=instagram+influencer&sort=top&t=year&limit=100", "crypto"),
    ("https://www.reddit.com/r/cryptotrading/search.json?q=instagram&sort=top&t=year&limit=100", "crypto"),
    ("https://www.reddit.com/r/Twitch/search.json?q=instagram&sort=top&t=year&limit=100", "gaming_general"),
    ("https://www.reddit.com/r/LivestreamFail/search.json?q=instagram+cs2&sort=top&t=year&limit=100", "cs2"),
]


def _extract_handles(text: str) -> list[str]:
    handles: list[str] = []
    for m in _IG_URL_RE.finditer(text):
        h = m.group(1).strip().rstrip("/")
        if h.lower() not in _IGNORED_IG:
            handles.append(h)
    for m in _IG_HANDLE_RE.finditer(text):
        h = m.group(1).strip()
        if h.lower() not in _IGNORED_IG and len(h) >= 3:
            handles.append(h)
    return list(dict.fromkeys(handles))


def _extract_text_from_listing(data: dict) -> str:
    """Walk Reddit JSON listing and collect all selftext + title + body."""
    texts: list[str] = []
    try:
        for child in data.get("data", {}).get("children", []):
            d = child.get("data", {})
            texts.append(d.get("title", ""))
            texts.append(d.get("selftext", ""))
            texts.append(d.get("body", ""))
            texts.append(d.get("url", ""))
    except Exception:
        pass
    return " ".join(texts)


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:  # noqa: ARG001
    """firecrawl_client is unused here — Reddit JSON API is used directly."""
    profiles: list[DiscoveredProfile] = []

    for url, niche in _SEARCH_QUERIES:
        log.info("[reddit] %s (niche=%s)", url[:80], niche)
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            text = _extract_text_from_listing(data)
            handles = _extract_handles(text)
            log.info("[reddit] found %d handles", len(handles))
            for h in handles:
                profiles.append(
                    DiscoveredProfile(
                        username=h,
                        niche=niche,
                        discovered_via="reddit",
                        import_batch_id=config.BATCH_ID,
                    )
                )
        except Exception as exc:
            log.error("[reddit] failed (%s): %s", url[:60], exc)

        time.sleep(1.5)  # Reddit public API: ~1 req/s

    return profiles
