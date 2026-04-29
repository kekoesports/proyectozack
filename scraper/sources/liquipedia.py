"""
Liquipedia CS2 + Valorant player pages → Instagram handles.
Uses Liquipedia's public MediaWiki API — no scraping, no JS needed, no Firecrawl.
Polite: Liquipedia asks for 1 req/s and a descriptive User-Agent.
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
    "User-Agent": "SocialProScraper/1.0 (https://socialpro.es; admin@socialpro.es) python-requests/2.31",
}

# Liquipedia MediaWiki API endpoint
_CS2_API = "https://liquipedia.net/counterstrike/api.php"
_VAL_API  = "https://liquipedia.net/valorant/api.php"

# Player page titles to fetch (wiki page names)
_CS2_PLAYERS = [
    "S1mple", "Electronic", "B1T", "NiKo", "ZywOo", "rain", "karrigan",
    "broky", "Twistzz", "ropz", "device", "dupreeh", "Magisk", "gla1ve",
    "blameF", "k0nfig", "sh1ro", "Ax1Le", "JAME", "HObbit", "torzsi",
    "siuhy", "xertioN", "headtr1ck", "frozen", "stavn", "TeSeS", "jabbi",
    "hallzerk", "HooXi", "Brollan", "hampus", "YEKINDAR", "iM", "Snappi",
    "Stewie2K", "NAF", "EliGE", "Twistzz", "FalleN", "fer", "coldzera",
    "KSCERATO", "yuurih", "arT", "saffee",
]

_VAL_PLAYERS = [
    "TenZ", "Shroud", "yay", "Asuna", "Wardell", "ShahZaM", "SicK",
    "zombs", "Sinatraa", "subroza", "Derke", "Boaster", "Alfajer",
    "nAts", "SACY", "pancada", "aspas", "Less", "cauanzin", "crashies",
    "Victor", "s0m", "Chronicle", "Mako", "something", "Jamppi",
    "Leo", "ScreaM", "RieNs", "Nivera",
]


def _fetch_wikitext(api_url: str, title: str) -> str:
    params = {
        "action": "query",
        "titles": title,
        "prop": "revisions",
        "rvprop": "content",
        "format": "json",
        "formatversion": "2",
    }
    try:
        resp = requests.get(api_url, params=params, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", [])
        if pages and "revisions" in pages[0]:
            return pages[0]["revisions"][0].get("content", "")
    except Exception as exc:
        log.warning("[liquipedia] API fetch failed for %s: %s", title, exc)
    return ""


def _extract_handles(text: str) -> list[str]:
    handles = []
    for m in _IG_URL_RE.finditer(text):
        h = m.group(1).strip().rstrip("/")
        if h.lower() not in _IGNORED_IG:
            handles.append(h)
    # Also match |instagram=handle in wiki infoboxes
    for m in re.finditer(r'\|\s*instagram\s*=\s*([A-Za-z0-9_.]{3,30})', text, re.IGNORECASE):
        h = m.group(1).strip()
        if h and h.lower() not in _IGNORED_IG:
            handles.append(h)
    return list(dict.fromkeys(handles))


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:  # noqa: ARG001
    profiles: list[DiscoveredProfile] = []

    groups = [
        (_CS2_API, _CS2_PLAYERS, "cs2"),
        (_VAL_API, _VAL_PLAYERS, "valorant"),
    ]

    for api_url, players, niche in groups:
        for player in players:
            log.info("[liquipedia] %s (niche=%s)", player, niche)
            wikitext = _fetch_wikitext(api_url, player)
            if wikitext:
                handles = _extract_handles(wikitext)
                log.info("[liquipedia] %s → %d handles", player, len(handles))
                for h in handles:
                    profiles.append(DiscoveredProfile(
                        username=h,
                        niche=niche,
                        discovered_via="liquipedia",
                        import_batch_id=config.BATCH_ID,
                    ))
            time.sleep(1.2)  # Liquipedia asks ~1 req/s

    return profiles
