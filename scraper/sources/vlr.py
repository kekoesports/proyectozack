"""
VLR.gg Valorant player/team pages → Instagram handles.
Uses Firecrawl for JS-rendered content.
"""
import logging
import re

from scraper.models import DiscoveredProfile

log = logging.getLogger(__name__)

_IG_URL_RE = re.compile(
    r'instagram\.com/([A-Za-z0-9_.]{3,30})(?:/|\b)',
    re.IGNORECASE,
)
_PLAYER_LINK_RE = re.compile(r'/player/\d+/[a-z0-9_-]+', re.IGNORECASE)

_IGNORED_HANDLES = {"p", "reel", "stories", "explore", "direct", "accounts"}


def _clean_handle(h: str) -> str | None:
    h = h.strip().rstrip("/")
    if h.lower() in _IGNORED_HANDLES:
        return None
    return h


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:
    profiles: list[DiscoveredProfile] = []
    urls = config.SOURCES["vlr_players"]["urls"]

    for url in urls:
        log.info("[vlr] scraping rankings: %s", url)
        try:
            result = firecrawl_client.scrape(url)
            text = result.get("markdown", "") or result.get("content", "")

            # Step 1: find player profile links to crawl deeper
            player_paths = list(dict.fromkeys(_PLAYER_LINK_RE.findall(text)))
            log.info("[vlr] found %d player profile links", len(player_paths))

            # Step 2: crawl each player page for IG links
            for path in player_paths[:50]:  # cap at 50 players per run
                player_url = f"https://www.vlr.gg{path}"
                try:
                    p_result = firecrawl_client.scrape(player_url)
                    p_text = p_result.get("markdown", "") or p_result.get("content", "")
                    for m in _IG_URL_RE.finditer(p_text):
                        handle = _clean_handle(m.group(1))
                        if handle:
                            profiles.append(
                                DiscoveredProfile(
                                    username=handle,
                                    niche="valorant",
                                    discovered_via="vlr_players",
                                    import_batch_id=config.BATCH_ID,
                                )
                            )
                except Exception as exc:
                    log.warning("[vlr] player page failed (%s): %s", path, exc)

            # Also scan ranking page itself
            for m in _IG_URL_RE.finditer(text):
                handle = _clean_handle(m.group(1))
                if handle:
                    profiles.append(
                        DiscoveredProfile(
                            username=handle,
                            niche="valorant",
                            discovered_via="vlr_players",
                            import_batch_id=config.BATCH_ID,
                        )
                    )

        except Exception as exc:
            log.error("[vlr] failed: %s", exc)

    return profiles
