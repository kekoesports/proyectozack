"""
VLR.gg Valorant player pages → Instagram handles.
Uses requests directly — VLR.gg renders player socials in static HTML.
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# VLR.gg player profile URLs (player ID + slug)
_PLAYER_URLS = [
    "https://www.vlr.gg/player/2/tenz",
    "https://www.vlr.gg/player/1866/yay",
    "https://www.vlr.gg/player/1094/asuna",
    "https://www.vlr.gg/player/896/wardell",
    "https://www.vlr.gg/player/93/shahzam",
    "https://www.vlr.gg/player/1195/sinatraa",
    "https://www.vlr.gg/player/253/zombs",
    "https://www.vlr.gg/player/9/subroza",
    "https://www.vlr.gg/player/1063/sick",
    "https://www.vlr.gg/player/7/naf",
    "https://www.vlr.gg/player/5/crashies",
    "https://www.vlr.gg/player/1161/victor",
    "https://www.vlr.gg/player/4866/derke",
    "https://www.vlr.gg/player/4060/boaster",
    "https://www.vlr.gg/player/4058/alfajer",
    "https://www.vlr.gg/player/4062/nats",
    "https://www.vlr.gg/player/4061/chronicle",
    "https://www.vlr.gg/player/1389/sacy",
    "https://www.vlr.gg/player/1386/pancada",
    "https://www.vlr.gg/player/1386/aspas",
    "https://www.vlr.gg/player/5048/less",
    "https://www.vlr.gg/player/10586/cauanzin",
    "https://www.vlr.gg/player/1002/scream",
    "https://www.vlr.gg/player/1001/nivera",
    "https://www.vlr.gg/player/466/jamppi",
    "https://www.vlr.gg/player/24/zeek",
    "https://www.vlr.gg/player/8/leaf",
    "https://www.vlr.gg/player/6/s0m",
    "https://www.vlr.gg/player/11/drone",
    "https://www.vlr.gg/player/12/aproto",
]


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:  # noqa: ARG001
    profiles: list[DiscoveredProfile] = []
    session = requests.Session()
    session.headers.update(_HEADERS)

    for url in _PLAYER_URLS:
        slug = url.split("/")[-1]
        log.info("[vlr] player: %s", slug)
        try:
            resp = session.get(url, timeout=15)
            resp.raise_for_status()
            handles = []
            for m in _IG_URL_RE.finditer(resp.text):
                h = m.group(1).strip().rstrip("/")
                if h.lower() not in _IGNORED_IG:
                    handles.append(h)
            handles = list(dict.fromkeys(handles))
            log.info("[vlr] %s → %d handles", slug, len(handles))
            for h in handles:
                profiles.append(DiscoveredProfile(
                    username=h,
                    niche="valorant",
                    discovered_via="vlr",
                    import_batch_id=config.BATCH_ID,
                ))
        except Exception as exc:
            log.warning("[vlr] %s failed: %s", slug, exc)
        time.sleep(config.REQUEST_DELAY_SECONDS)

    return profiles
