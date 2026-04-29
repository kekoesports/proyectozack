"""
TwitchTracker channel rankings → streamer names → look for linked IG on Twitch pages.
Uses Firecrawl for JS-rendered content.
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
# TwitchTracker: channel links look like /channelname/streams in markdown
_CHANNEL_LINK_RE = re.compile(r'\[([A-Za-z0-9_]{4,25})\]\(https://twitchtracker\.com/[A-Za-z0-9_]+\)')
_IGNORED_IG = {"p", "reel", "stories", "explore", "direct", "accounts", "reels"}

# Top streamer pages per category — these list top channels directly
_TRACKER_PAGES: list[tuple[str, str]] = [
    ("https://twitchtracker.com/channels/ranking?game=Counter-Strike", "cs2"),
    ("https://twitchtracker.com/channels/ranking?game=VALORANT", "valorant"),
    ("https://twitchtracker.com/channels/ranking?game=Slots", "gambling"),
    ("https://twitchtracker.com/channels/ranking?game=Casino", "gambling"),
    ("https://twitchtracker.com/channels/ranking", "gaming_general"),
]


def _niche_from_url(url: str) -> str:
    u = url.lower()
    if "counter-strike" in u:
        return "cs2"
    if "valorant" in u:
        return "valorant"
    if "slot" in u or "casino" in u:
        return "gambling"
    return "gaming_general"


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:
    profiles: list[DiscoveredProfile] = []

    for url, niche in _TRACKER_PAGES:
        log.info("[twitchtracker] %s (niche=%s)", url, niche)

        try:
            result = firecrawl_client.scrape(url)
            text = result.get("markdown", "") or result.get("content", "")
        except Exception as exc:
            log.error("[twitchtracker] page fetch failed (%s): %s", url, exc)
            continue

        # Extract channel names from markdown links or plain text
        channels = list(dict.fromkeys(_CHANNEL_LINK_RE.findall(text)))

        # Fallback: look for twitchtracker.com/<channel> patterns in raw text
        if not channels:
            raw_pat = re.compile(r'twitchtracker\.com/([A-Za-z0-9_]{4,25})(?:/|$|\s)')
            channels = list(dict.fromkeys(raw_pat.findall(text)))

        log.info("[twitchtracker] found %d channels", len(channels))

        for channel in channels[:30]:
            # Skip tracker meta-pages
            if channel.lower() in {"channels", "ranking", "games", "streams", "clips"}:
                continue
            twitch_url = f"https://www.twitch.tv/{channel}"
            try:
                time.sleep(config.REQUEST_DELAY_SECONDS)
                c_result = firecrawl_client.scrape(twitch_url)
                c_text = c_result.get("markdown", "") or c_result.get("content", "")
            except Exception as exc:
                log.warning("[twitchtracker] Twitch page failed (%s): %s", channel, exc)
                continue

            for m in _IG_URL_RE.finditer(c_text):
                h = m.group(1).strip().rstrip("/")
                if h.lower() not in _IGNORED_IG:
                    profiles.append(
                        DiscoveredProfile(
                            username=h,
                            niche=niche,
                            discovered_via="twitchtracker",
                            import_batch_id=config.BATCH_ID,
                        )
                    )

    return profiles
