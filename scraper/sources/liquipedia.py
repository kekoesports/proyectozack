"""
Liquipedia CS2 + Valorant player pages → Instagram handles.
Uses Firecrawl (JS-rendered) because Liquipedia requires JavaScript.
"""
import logging
import re
import time

from scraper.models import DiscoveredProfile

log = logging.getLogger(__name__)

_IG_URL_RE = re.compile(
    r'instagram\.com/([A-Za-z0-9_.]{3,30})(?:/|\b)',
    re.IGNORECASE,
)
_IGNORED_IG = {"p", "reel", "stories", "explore", "direct", "accounts", "reels"}

# Direct player pages and team pages with known IG links
# (index pages don't list IG; we target team rosters directly)
_CS2_TEAM_PAGES = [
    "https://liquipedia.net/counterstrike/Natus_Vincere",
    "https://liquipedia.net/counterstrike/FaZe_Clan",
    "https://liquipedia.net/counterstrike/Team_Vitality",
    "https://liquipedia.net/counterstrike/G2_Esports",
    "https://liquipedia.net/counterstrike/Team_Spirit",
    "https://liquipedia.net/counterstrike/Virtus.pro",
    "https://liquipedia.net/counterstrike/Heroic",
    "https://liquipedia.net/counterstrike/MOUZ",
    "https://liquipedia.net/counterstrike/Astralis",
    "https://liquipedia.net/counterstrike/Cloud9",
    "https://liquipedia.net/counterstrike/ENCE",
    "https://liquipedia.net/counterstrike/Complexity_Gaming",
]

_VAL_TEAM_PAGES = [
    "https://liquipedia.net/valorant/Team_Liquid",
    "https://liquipedia.net/valorant/Sentinels",
    "https://liquipedia.net/valorant/NRG_Esports",
    "https://liquipedia.net/valorant/Cloud9",
    "https://liquipedia.net/valorant/LOUD",
    "https://liquipedia.net/valorant/FNATIC",
    "https://liquipedia.net/valorant/KRU_Esports",
    "https://liquipedia.net/valorant/Paper_Rex",
    "https://liquipedia.net/valorant/NAVI",
    "https://liquipedia.net/valorant/Team_Heretics",
    "https://liquipedia.net/valorant/G2_Esports",
]

# Player-specific search pages that list socials
_CS2_PLAYER_SEARCH = "https://liquipedia.net/counterstrike/Special:Search?search=instagram&ns0=1"
_VAL_PLAYER_SEARCH = "https://liquipedia.net/valorant/Special:Search?search=instagram&ns0=1"


def _extract_handles(text: str) -> list[str]:
    handles: list[str] = []
    for m in _IG_URL_RE.finditer(text):
        h = m.group(1).strip().rstrip("/")
        if h.lower() not in _IGNORED_IG and len(h) >= 3:
            handles.append(h)
    return list(dict.fromkeys(handles))


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:
    profiles: list[DiscoveredProfile] = []

    page_groups = [
        (_CS2_TEAM_PAGES, "cs2"),
        (_VAL_TEAM_PAGES, "valorant"),
    ]

    for pages, niche in page_groups:
        for url in pages:
            log.info("[liquipedia] %s (niche=%s)", url, niche)
            try:
                result = firecrawl_client.scrape(url)
                text = result.get("markdown", "") or result.get("content", "")
                handles = _extract_handles(text)
                log.info("[liquipedia] %d handles from %s", len(handles), url.split("/")[-1])
                for h in handles:
                    profiles.append(
                        DiscoveredProfile(
                            username=h,
                            niche=niche,
                            discovered_via="liquipedia",
                            import_batch_id=config.BATCH_ID,
                        )
                    )
            except Exception as exc:
                log.warning("[liquipedia] failed (%s): %s", url.split("/")[-1], exc)
            time.sleep(config.REQUEST_DELAY_SECONDS)

    return profiles
