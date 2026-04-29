"""
SullyGnome streamer rankings → extract streamer names,
then look for IG links on their Twitch pages via Firecrawl.
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
# SullyGnome markdown: channel links like [ChannelName](https://sullygnome.com/channel/ChannelName/...)
_CHANNEL_LINK_RE = re.compile(r'sullygnome\.com/channel/([A-Za-z0-9_]{4,25})/')
_IGNORED_IG = {"p", "reel", "stories", "explore", "direct", "accounts", "reels"}

_PAGES: list[tuple[str, str]] = [
    ("https://sullygnome.com/games/Counter-Strike/30/watched", "cs2"),
    ("https://sullygnome.com/games/VALORANT/30/watched", "valorant"),
    ("https://sullygnome.com/games/Slots/30/watched", "gambling"),
]


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:
    profiles: list[DiscoveredProfile] = []

    for url, niche in _PAGES:
        log.info("[sullygnome] %s (niche=%s)", url, niche)

        try:
            result = firecrawl_client.scrape(url)
            text = result.get("markdown", "") or result.get("content", "")
        except Exception as exc:
            log.error("[sullygnome] fetch failed (%s): %s", url, exc)
            continue

        channels = list(dict.fromkeys(_CHANNEL_LINK_RE.findall(text)))
        log.info("[sullygnome] found %d channels", len(channels))

        for channel in channels[:25]:
            twitch_url = f"https://www.twitch.tv/{channel}"
            try:
                time.sleep(config.REQUEST_DELAY_SECONDS)
                c_result = firecrawl_client.scrape(twitch_url)
                c_text = c_result.get("markdown", "") or c_result.get("content", "")
            except Exception as exc:
                log.warning("[sullygnome] Twitch page failed (%s): %s", channel, exc)
                continue

            for m in _IG_URL_RE.finditer(c_text):
                h = m.group(1).strip().rstrip("/")
                if h.lower() not in _IGNORED_IG:
                    profiles.append(
                        DiscoveredProfile(
                            username=h,
                            niche=niche,
                            discovered_via="sullygnome",
                            import_batch_id=config.BATCH_ID,
                        )
                    )

    return profiles
