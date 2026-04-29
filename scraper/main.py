"""
Instagram target discovery scraper.
Pipeline: sources → deduplicate → insert to DB (status=pendiente, manual review in admin).

Usage (from project root):
    python -m scraper.main                     # all enabled sources
    python -m scraper.main --sources reddit known_handles
    python -m scraper.main --dry-run
"""
import argparse
import logging
import sys
import time
from typing import Callable

import colorlog

import scraper.config as config
from scraper.db import count_targets, get_connection, upsert_profiles
from scraper.firecrawl_client import FirecrawlClient
from scraper.models import DiscoveredProfile
from scraper.sources import known_handles, reddit, hltv, vlr, liquipedia, twitchtracker, sullygnome


def _setup_logging() -> None:
    handler = colorlog.StreamHandler()
    handler.setFormatter(
        colorlog.ColoredFormatter(
            "%(log_color)s%(asctime)s [%(levelname)s] %(message)s%(reset)s",
            datefmt="%H:%M:%S",
            log_colors={
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "bold_red",
            },
        )
    )
    logging.getLogger().setLevel(logging.INFO)
    logging.getLogger().addHandler(handler)


SOURCE_REGISTRY: dict[str, Callable] = {
    "reddit":        reddit.scrape,         # Reddit JSON API — free, fast, no Firecrawl
    "known_handles": known_handles.scrape,  # curated seed list — instant, no network
    "hltv":          hltv.scrape,           # HLTV CS2 player pages
    "vlr":           vlr.scrape,            # VLR.gg Valorant
    "liquipedia":    liquipedia.scrape,     # Liquipedia team rosters
    "twitchtracker": twitchtracker.scrape,  # Twitch rankings
    "sullygnome":    sullygnome.scrape,     # SullyGnome rankings
}

# Sources that don't need Firecrawl
_NO_FIRECRAWL = {"reddit", "known_handles"}


def _dedup(profiles: list[DiscoveredProfile]) -> list[DiscoveredProfile]:
    seen: set[str] = set()
    result: list[DiscoveredProfile] = []
    for p in profiles:
        key = p.username.lower()
        if key not in seen:
            seen.add(key)
            result.append(p)
    return result


def main() -> None:
    _setup_logging()
    log = logging.getLogger(__name__)

    parser = argparse.ArgumentParser(description="Instagram target scraper")
    parser.add_argument(
        "--sources", nargs="+",
        choices=list(SOURCE_REGISTRY.keys()),
        default=["reddit", "known_handles"],
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    log.info("=== SocialPro Instagram Target Scraper ===")
    log.info("Sources  : %s", args.sources)
    log.info("Dry run  : %s", args.dry_run)
    log.info("Batch ID : %s", config.BATCH_ID)

    # Only init Firecrawl if a source that needs it is selected
    needs_firecrawl = any(s not in _NO_FIRECRAWL for s in args.sources)
    fc = FirecrawlClient(
        api_key=config.FIRECRAWL_API_KEY,
        timeout=config.FIRECRAWL_TIMEOUT,
        max_retries=config.MAX_RETRIES,
    ) if needs_firecrawl else None

    candidates: list[DiscoveredProfile] = []

    for source_key in args.sources:
        scrape_fn = SOURCE_REGISTRY[source_key]
        log.info("─── Source: %s ───", source_key)
        t0 = time.time()
        try:
            profiles = scrape_fn(fc, config)
            elapsed = time.time() - t0
            log.info("[%s] %.1fs → %d candidates", source_key, elapsed, len(profiles))
            candidates.extend(profiles)
        except Exception as exc:
            log.error("[%s] crashed: %s", source_key, exc)

        if source_key not in _NO_FIRECRAWL:
            time.sleep(config.REQUEST_DELAY_SECONDS)

    before = len(candidates)
    candidates = _dedup(candidates)
    log.info("Dedup: %d → %d unique", before, len(candidates))

    if not candidates:
        log.warning("No candidates. Exiting.")
        sys.exit(0)

    if args.dry_run:
        log.info("[DRY RUN] Would insert %d profiles. Sample:", len(candidates))
        for p in candidates[:20]:
            log.info("  @%-30s niche=%-15s via=%s", p.username, p.niche or "?", p.discovered_via)
        sys.exit(0)

    log.info("Connecting to Neon Postgres…")
    conn = get_connection(config.DATABASE_URL)
    before_count = count_targets(conn)
    log.info("Targets in DB before: %d", before_count)

    inserted, skipped = upsert_profiles(conn, candidates, min_followers=0, max_followers=0)
    after_count = count_targets(conn)
    conn.close()

    log.info("─── Summary ───")
    log.info("  Candidates   : %d", len(candidates))
    log.info("  Inserted     : %d", inserted)
    log.info("  Skipped      : %d", skipped)
    log.info("  DB now       : %d  (+%d)", after_count, after_count - before_count)
    log.info("Done. Review targets in admin → mark as contactado/descartado.")


if __name__ == "__main__":
    main()
