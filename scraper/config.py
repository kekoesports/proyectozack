"""
Scraper configuration: niches, filters, and source URLs.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local from project root (two levels up from this file)
_ROOT = Path(__file__).parent.parent
load_dotenv(_ROOT / ".env.local")

# ── Credentials ──────────────────────────────────────────────────────────────
DATABASE_URL: str = os.environ["DATABASE_URL"]
FIRECRAWL_API_KEY: str = os.environ["FIRECRAWL_API_KEY"]

# ── Follower filter ───────────────────────────────────────────────────────────
MIN_FOLLOWERS = 10_000
MAX_FOLLOWERS = 100_000  # 0 = no upper limit

# ── Batch tag written to discovered_via ──────────────────────────────────────
# Change per run to track different scrape sessions
BATCH_ID = "scrape-2026-04"

# ── Niches → keywords used to match/discard profiles ─────────────────────────
NICHE_KEYWORDS: dict[str, list[str]] = {
    "cs2": [
        "cs2", "counter-strike", "csgo", "cs:go", "faceit",
        "hltv", "navi", "faze", "vitality", "skin", "case",
    ],
    "valorant": [
        "valorant", "valo", "riot games", "radiant", "immortal",
        "vct", "esports",
    ],
    "gambling": [
        "gambling", "casino", "betcris", "stake", "roobet",
        "csgoroll", "bet", "slots", "poker", "blackjack",
    ],
    "lifestyle": [
        "lifestyle", "daily", "vlog", "fitness", "gym", "travel",
        "fashion", "grwm", "routine",
    ],
    "crypto": [
        "crypto", "bitcoin", "btc", "eth", "ethereum", "nft",
        "web3", "defi", "altcoin", "blockchain", "trading",
    ],
    "gaming_general": [
        "gaming", "gamer", "streamer", "twitch", "content creator",
        "youtube", "esports", "fps", "rpg",
    ],
}

# ── Sources ───────────────────────────────────────────────────────────────────
# Each source is a dict consumed by its scraper module.
SOURCES = {
    # --- Curated influencer list sites + ProSettings player pages ---
    "influencer_lists": {
        "enabled": True,
    },
    # --- CS2 players from HLTV top rankings ---
    "hltv_top_players": {
        "enabled": True,
        "urls": [
            "https://www.hltv.org/ranking/players",
        ],
    },
    # --- Valorant pro players from VLR.gg ---
    "vlr_players": {
        "enabled": True,
        "urls": [
            "https://www.vlr.gg/rankings",
        ],
    },
    # --- Twitch gaming/gambling directory via Firecrawl ---
    "twitch_directory": {
        "enabled": True,
        "categories": [
            "Counter-Strike",
            "VALORANT",
            "Slots",
            "Casino",
            "Crypto",
            "Gambling",
            "Just Chatting",
        ],
    },
    # --- Liquipedia CS2 players ---
    "liquipedia_cs2": {
        "enabled": True,
        "urls": [
            "https://liquipedia.net/counterstrike/S-Tier_Tournaments",
        ],
    },
    # --- Liquipedia Valorant ---
    "liquipedia_valorant": {
        "enabled": True,
        "urls": [
            "https://liquipedia.net/valorant/S-Tier_Tournaments",
        ],
    },
    # --- Reddit threads with influencer lists ---
    "reddit_lists": {
        "enabled": True,
        "urls": [
            "https://www.reddit.com/r/csgo/search/?q=instagram+influencer&sort=top",
            "https://www.reddit.com/r/ValorantCompetitive/search/?q=instagram+streamer&sort=top",
            "https://www.reddit.com/r/gambling/search/?q=instagram+streamer&sort=top",
            "https://www.reddit.com/r/CryptoInfluencer/top/?t=year",
        ],
    },
    # --- TwitchTracker top streamers ---
    "twitchtracker": {
        "enabled": True,
        "urls": [
            "https://twitchtracker.com/channels/ranking?game=Counter-Strike",
            "https://twitchtracker.com/channels/ranking?game=VALORANT",
            "https://twitchtracker.com/channels/ranking?game=Slots",
        ],
    },
    # --- SullyGnome streamer rankings ---
    "sullygnome": {
        "enabled": True,
        "urls": [
            "https://sullygnome.com/games/Counter-Strike/30/watched",
            "https://sullygnome.com/games/VALORANT/30/watched",
        ],
    },
}

# ── Request settings ──────────────────────────────────────────────────────────
REQUEST_DELAY_SECONDS = 2.0   # polite delay between Scrapling requests
FIRECRAWL_TIMEOUT = 30        # seconds per Firecrawl call
MAX_RETRIES = 3
