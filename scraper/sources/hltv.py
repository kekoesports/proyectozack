"""
HLTV CS2 player pages → Instagram handles.
Uses HLTV's undocumented stats API (JSON) + player profile scraping via requests.
No Firecrawl needed.
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
_IGNORED_IG = {"p", "reel", "reels", "stories", "explore", "direct", "accounts"}

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.hltv.org/",
    "Accept-Language": "en-US,en;q=0.9",
}

# HLTV top 30 player profile URLs (manually curated — these don't change often)
_PLAYER_URLS = [
    "https://www.hltv.org/player/7998/s1mple",
    "https://www.hltv.org/player/8918/electronic",
    "https://www.hltv.org/player/11816/b1t",
    "https://www.hltv.org/player/9035/niko",
    "https://www.hltv.org/player/11811/zywoo",
    "https://www.hltv.org/player/9032/rain",
    "https://www.hltv.org/player/8586/karrigan",
    "https://www.hltv.org/player/10394/broky",
    "https://www.hltv.org/player/10314/twistzz",
    "https://www.hltv.org/player/11816/ropz",
    "https://www.hltv.org/player/7592/device",
    "https://www.hltv.org/player/8520/dupreeh",
    "https://www.hltv.org/player/8517/Magisk",
    "https://www.hltv.org/player/8372/gla1ve",
    "https://www.hltv.org/player/9960/blameF",
    "https://www.hltv.org/player/9215/k0nfig",
    "https://www.hltv.org/player/18053/sh1ro",
    "https://www.hltv.org/player/18053/ax1le",
    "https://www.hltv.org/player/12607/jame",
    "https://www.hltv.org/player/9399/hobbit",
    "https://www.hltv.org/player/15631/torzsi",
    "https://www.hltv.org/player/18619/siuhy",
    "https://www.hltv.org/player/19230/xertioN",
    "https://www.hltv.org/player/16250/headtr1ck",
    "https://www.hltv.org/player/16702/frozen",
    "https://www.hltv.org/player/11888/stavn",
    "https://www.hltv.org/player/10399/TeSeS",
    "https://www.hltv.org/player/14161/jabbi",
    "https://www.hltv.org/player/17989/hallzerk",
    "https://www.hltv.org/player/9259/hunter",
    "https://www.hltv.org/player/9256/nexa",
    "https://www.hltv.org/player/16228/huNter",
]


def _extract_handles(html: str) -> list[str]:
    handles = []
    for m in _IG_URL_RE.finditer(html):
        h = m.group(1).strip().rstrip("/")
        if h.lower() not in _IGNORED_IG:
            handles.append(h)
    return list(dict.fromkeys(handles))


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:  # noqa: ARG001
    profiles: list[DiscoveredProfile] = []
    session = requests.Session()
    session.headers.update(_HEADERS)

    for url in _PLAYER_URLS:
        slug = url.split("/")[-1]
        log.info("[hltv] player: %s", slug)
        try:
            resp = session.get(url, timeout=15)
            resp.raise_for_status()
            handles = _extract_handles(resp.text)
            log.info("[hltv] %s → %d handles", slug, len(handles))
            for h in handles:
                profiles.append(DiscoveredProfile(
                    username=h,
                    niche="cs2",
                    discovered_via="hltv",
                    import_batch_id=config.BATCH_ID,
                ))
        except Exception as exc:
            log.warning("[hltv] %s failed: %s", slug, exc)
        time.sleep(config.REQUEST_DELAY_SECONDS)

    return profiles
