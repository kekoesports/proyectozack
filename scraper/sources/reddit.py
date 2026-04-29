"""
Reddit public JSON API → extract Instagram handles from posts/comments.
No auth, no Firecrawl. Rate limit: ~1 req/s.

Strategy: search for "instagram" in gaming/gambling/crypto subreddits.
These posts are typically "follow me on IG", "check my IG", player socials, etc.
Signal quality is medium — needs manual review in admin.
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
_IG_HANDLE_RE = re.compile(r'@([A-Za-z0-9_.]{5,30})')
_IGNORED_IG = {
    "p", "reel", "reels", "stories", "explore", "direct",
    "accounts", "sharedfiles", "tv", "ar", "about", "help",
}

_HEADERS = {
    "User-Agent": "SocialProScraper/1.0 (contact: admin@socialpro.es)",
}

# (url, niche)
_QUERIES: list[tuple[str, str]] = [
    # ── CS2 ─────────────────────────────────────────────────────────────────
    ("https://www.reddit.com/r/GlobalOffensive/search.json?q=instagram&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/csgo/search.json?q=instagram&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/LearnCSGO/search.json?q=instagram&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/cs2/search.json?q=instagram&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/GlobalOffensive/search.json?q=follow+instagram&sort=top&t=all&limit=100", "cs2"),
    # ── Valorant ────────────────────────────────────────────────────────────
    ("https://www.reddit.com/r/ValorantCompetitive/search.json?q=instagram&sort=top&t=year&limit=100", "valorant"),
    ("https://www.reddit.com/r/VALORANT/search.json?q=instagram+streamer&sort=top&t=year&limit=100", "valorant"),
    ("https://www.reddit.com/r/ValorantCompetitive/search.json?q=follow+instagram&sort=top&t=all&limit=100", "valorant"),
    # ── Gambling ────────────────────────────────────────────────────────────
    ("https://www.reddit.com/r/gambling/search.json?q=instagram&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/casinoslots/search.json?q=instagram&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/Stake/search.json?q=instagram&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/sportsbetting/search.json?q=instagram&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/onlinegambling/search.json?q=instagram&sort=top&t=year&limit=100", "gambling"),
    # ── Crypto ──────────────────────────────────────────────────────────────
    ("https://www.reddit.com/r/CryptoCurrency/search.json?q=instagram+influencer&sort=top&t=year&limit=100", "crypto"),
    ("https://www.reddit.com/r/cryptotrading/search.json?q=instagram&sort=top&t=year&limit=100", "crypto"),
    ("https://www.reddit.com/r/Bitcoin/search.json?q=instagram&sort=top&t=year&limit=100", "crypto"),
    ("https://www.reddit.com/r/altcoin/search.json?q=instagram&sort=top&t=year&limit=100", "crypto"),
    ("https://www.reddit.com/r/NFT/search.json?q=instagram&sort=top&t=year&limit=100", "crypto"),
    # ── Gaming / Lifestyle ───────────────────────────────────────────────────
    ("https://www.reddit.com/r/Twitch/search.json?q=instagram&sort=top&t=year&limit=100", "gaming_general"),
    ("https://www.reddit.com/r/LivestreamFail/search.json?q=instagram+cs2&sort=top&t=year&limit=100", "cs2"),
    ("https://www.reddit.com/r/LivestreamFail/search.json?q=instagram+valorant&sort=top&t=year&limit=100", "valorant"),
    ("https://www.reddit.com/r/LivestreamFail/search.json?q=instagram+gambling&sort=top&t=year&limit=100", "gambling"),
    ("https://www.reddit.com/r/gaming/search.json?q=instagram+gamer&sort=top&t=year&limit=100", "gaming_general"),
    ("https://www.reddit.com/r/esports/search.json?q=instagram&sort=top&t=year&limit=100", "gaming_general"),
    ("https://www.reddit.com/r/StreamerDiscovery/search.json?q=instagram&sort=top&t=all&limit=100", "gaming_general"),
    # ── CS2 skins / gambling adjacent ───────────────────────────────────────
    ("https://www.reddit.com/r/csgobetting/search.json?q=instagram&sort=top&t=all&limit=100", "gambling"),
    ("https://www.reddit.com/r/csgomarketforum/search.json?q=instagram&sort=top&t=all&limit=100", "cs2"),
]


def _extract_handles(text: str) -> list[str]:
    handles: list[str] = []
    for m in _IG_URL_RE.finditer(text):
        h = m.group(1).strip().rstrip("/")
        if h.lower() not in _IGNORED_IG:
            handles.append(h)
    for m in _IG_HANDLE_RE.finditer(text):
        h = m.group(1).strip()
        if h.lower() not in _IGNORED_IG:
            handles.append(h)
    return list(dict.fromkeys(handles))


def _extract_text(data: dict) -> str:
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
    profiles: list[DiscoveredProfile] = []

    for url, niche in _QUERIES:
        sub = url.split("/r/")[1].split("/")[0]
        log.info("[reddit] r/%s (niche=%s)", sub, niche)
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=15)
            resp.raise_for_status()
            text = _extract_text(resp.json())
            handles = _extract_handles(text)
            log.info("[reddit] r/%s → %d handles", sub, len(handles))
            for h in handles:
                profiles.append(DiscoveredProfile(
                    username=h,
                    niche=niche,
                    discovered_via=f"reddit/r/{sub}",
                    import_batch_id=config.BATCH_ID,
                ))
        except Exception as exc:
            log.error("[reddit] r/%s failed: %s", sub, exc)
        time.sleep(1.2)

    return profiles
