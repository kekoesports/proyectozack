"""
HLTV top players scraper → extracts Instagram handles when listed.
Uses Firecrawl (JS-rendered) because HLTV blocks basic requests.
"""
import logging
import re

from scraper.models import DiscoveredProfile

log = logging.getLogger(__name__)

# Regex to extract @handle or instagram.com/<handle> from any text blob
_IG_URL_RE = re.compile(
    r'instagram\.com/([A-Za-z0-9_.]{3,30})(?:/|\b)',
    re.IGNORECASE,
)
_IG_HANDLE_RE = re.compile(r'@([A-Za-z0-9_.]{3,30})')


def _extract_handles(text: str) -> list[str]:
    handles: list[str] = []
    for m in _IG_URL_RE.finditer(text):
        h = m.group(1)
        if h not in ("p", "reel", "stories", "explore", "direct"):
            handles.append(h)
    for m in _IG_HANDLE_RE.finditer(text):
        handles.append(m.group(1))
    return list(dict.fromkeys(handles))  # dedupe preserving order


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:
    """
    Scrape HLTV player ranking page via Firecrawl and extract any
    Instagram handles linked from player profiles.
    """
    profiles: list[DiscoveredProfile] = []
    urls = config.SOURCES["hltv_top_players"]["urls"]

    for url in urls:
        log.info("[hltv] scraping %s", url)
        try:
            result = firecrawl_client.scrape(url)
            text = result.get("markdown", "") or result.get("content", "")
            handles = _extract_handles(text)
            log.info("[hltv] found %d Instagram handles", len(handles))
            for handle in handles:
                profiles.append(
                    DiscoveredProfile(
                        username=handle,
                        niche="cs2",
                        discovered_via="hltv_top_players",
                        import_batch_id=config.BATCH_ID,
                    )
                )
        except Exception as exc:
            log.error("[hltv] failed: %s", exc)

    return profiles
