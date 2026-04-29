"""
High-quality influencer list sources — sites that curate ranked lists
of gaming/gambling/crypto Instagram accounts with niche context.

These pages explicitly list Instagram handles/URLs, so the signal-to-noise
ratio is much higher than Reddit mentions.
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
_IG_HANDLE_INLINE_RE = re.compile(r'@([A-Za-z0-9_.]{5,30})')
_IGNORED_IG = {
    "p", "reel", "reels", "stories", "explore", "direct",
    "accounts", "sharedfiles", "tv", "ar", "about",
}

# Each entry: (url, niche, use_firecrawl)
# use_firecrawl=True for JS-heavy sites; False for static ones (Firecrawl anyway)
_SOURCES: list[tuple[str, str]] = [
    # ── CS2 / Gaming ────────────────────────────────────────────────────────
    # Tracker.gg top CS2 players
    ("https://tracker.gg/cs2/leaderboards/stats/Premier/RankingTier?page=1", "cs2"),
    ("https://tracker.gg/cs2/leaderboards/stats/Premier/RankingTier?page=2", "cs2"),
    # ProSettings — top CS2 pro player profiles (each has IG links)
    ("https://prosettings.net/games/cs2/", "cs2"),
    # HLTV top 20 ranking page
    ("https://www.hltv.org/ranking/teams", "cs2"),
    # ── Valorant ────────────────────────────────────────────────────────────
    ("https://tracker.gg/valorant/leaderboards/ranked/pc/default?page=1", "valorant"),
    ("https://prosettings.net/games/valorant/", "valorant"),
    # ── Gambling / Slots streamers ───────────────────────────────────────────
    # Streamers.casino — dedicated gambling streamer directory
    ("https://streamers.casino/", "gambling"),
    ("https://streamers.casino/twitch/", "gambling"),
    # CasinoGrounds community top streamers
    ("https://www.casinogrounds.com/casino-streamers/", "gambling"),
    # ── Crypto ──────────────────────────────────────────────────────────────
    # LunarCrush influencer leaderboard
    ("https://lunarcrush.com/discover/people", "crypto"),
    # Influencer Marketing Hub crypto list (static article)
    ("https://influencermarketinghub.com/crypto-influencers/", "crypto"),
    # ── Lifestyle / Gaming general ───────────────────────────────────────────
    # Influencer Marketing Hub gaming list
    ("https://influencermarketinghub.com/gaming-influencers/", "gaming_general"),
    # Esports Charts top streamers
    ("https://escharts.com/top-streamers", "gaming_general"),
    ("https://escharts.com/top-streamers?game=cs2", "cs2"),
    ("https://escharts.com/top-streamers?game=valorant", "valorant"),
]

# ProSettings individual player pages — each bio links to their IG
_PROSETTINGS_CS2_PLAYERS = [
    "https://prosettings.net/players/s1mple/",
    "https://prosettings.net/players/niko/",
    "https://prosettings.net/players/zywoo/",
    "https://prosettings.net/players/electronic/",
    "https://prosettings.net/players/device/",
    "https://prosettings.net/players/ropz/",
    "https://prosettings.net/players/sh1ro/",
    "https://prosettings.net/players/b1t/",
    "https://prosettings.net/players/broky/",
    "https://prosettings.net/players/karrigan/",
    "https://prosettings.net/players/twistzz/",
    "https://prosettings.net/players/rain/",
    "https://prosettings.net/players/hobbit/",
    "https://prosettings.net/players/ax1le/",
    "https://prosettings.net/players/perfecto/",
    "https://prosettings.net/players/jame/",
    "https://prosettings.net/players/apeks-hallzerk/",
    "https://prosettings.net/players/hunter/",
    "https://prosettings.net/players/nexa/",
    "https://prosettings.net/players/frozen/",
    "https://prosettings.net/players/dupreeh/",
    "https://prosettings.net/players/magisk/",
    "https://prosettings.net/players/gla1ve/",
    "https://prosettings.net/players/blameF/",
    "https://prosettings.net/players/headtr1ck/",
    "https://prosettings.net/players/xertioN/",
    "https://prosettings.net/players/torzsi/",
    "https://prosettings.net/players/siuhy/",
]

_PROSETTINGS_VAL_PLAYERS = [
    "https://prosettings.net/players/tenz/",
    "https://prosettings.net/players/shroud/",
    "https://prosettings.net/players/acend-cned/",
    "https://prosettings.net/players/yay/",
    "https://prosettings.net/players/asuna/",
    "https://prosettings.net/players/wardell/",
    "https://prosettings.net/players/derke/",
    "https://prosettings.net/players/nats/",
    "https://prosettings.net/players/sacy/",
    "https://prosettings.net/players/pancada/",
    "https://prosettings.net/players/leaf/",
    "https://prosettings.net/players/aspas/",
    "https://prosettings.net/players/less/",
    "https://prosettings.net/players/crashies/",
    "https://prosettings.net/players/victor/",
]


def _extract_handles(text: str) -> list[str]:
    handles: list[str] = []
    for m in _IG_URL_RE.finditer(text):
        h = m.group(1).strip().rstrip("/")
        if h.lower() not in _IGNORED_IG and len(h) >= 3:
            handles.append(h)
    return list(dict.fromkeys(handles))


def scrape(firecrawl_client, config) -> list[DiscoveredProfile]:
    profiles: list[DiscoveredProfile] = []

    # ── Directory / leaderboard pages ────────────────────────────────────────
    for url, niche in _SOURCES:
        log.info("[influencer_lists] %s (niche=%s)", url, niche)
        try:
            result = firecrawl_client.scrape(url)
            text = result.get("markdown", "") or result.get("content", "")
            handles = _extract_handles(text)
            log.info("[influencer_lists] %d handles from %s", len(handles), url.split("/")[2])
            for h in handles:
                profiles.append(DiscoveredProfile(
                    username=h,
                    niche=niche,
                    discovered_via="influencer_lists",
                    import_batch_id=config.BATCH_ID,
                ))
        except Exception as exc:
            log.warning("[influencer_lists] failed (%s): %s", url.split("/")[2], exc)
        time.sleep(config.REQUEST_DELAY_SECONDS)

    # ── ProSettings individual player pages (high precision) ─────────────────
    player_pages = [
        (_PROSETTINGS_CS2_PLAYERS, "cs2"),
        (_PROSETTINGS_VAL_PLAYERS, "valorant"),
    ]
    for page_list, niche in player_pages:
        for url in page_list:
            log.info("[prosettings] %s (niche=%s)", url.split("/")[-2], niche)
            try:
                result = firecrawl_client.scrape(url)
                text = result.get("markdown", "") or result.get("content", "")
                handles = _extract_handles(text)
                log.info("[prosettings] %d handles for %s", len(handles), url.split("/")[-2])
                for h in handles:
                    profiles.append(DiscoveredProfile(
                        username=h,
                        niche=niche,
                        discovered_via="prosettings",
                        import_batch_id=config.BATCH_ID,
                    ))
            except Exception as exc:
                log.warning("[prosettings] failed (%s): %s", url.split("/")[-2], exc)
            time.sleep(config.REQUEST_DELAY_SECONDS)

    return profiles
