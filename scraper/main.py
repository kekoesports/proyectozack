"""
Instagram target discovery scraper.
Pipeline: source → deduplicate candidates → enrich via IG (Firecrawl) → insert to DB.

Usage (from project root):
    python -m scraper.main                          # all sources + enrich
    python -m scraper.main --sources influencer_lists prosettings
    python -m scraper.main --no-enrich --dry-run    # skip IG validation (debug only)
    python -m scraper.main --min-followers 5000 --max-followers 200000
"""
import argparse
import logging
import sys
import time
from typing import Callable

import colorlog

import scraper.config as config
from scraper.db import count_targets, get_connection, upsert_profiles
from scraper.enrich import enrich_batch
from scraper.firecrawl_client import FirecrawlClient
from scraper.models import DiscoveredProfile
from scraper.sources import hltv, influencer_lists, known_handles, liquipedia, sullygnome, twitchtracker, vlr


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
    "known_handles":    known_handles.scrape,      # curated seed list — fast, no network
    "influencer_lists": influencer_lists.scrape,   # directory sites (Firecrawl)
    "hltv":             hltv.scrape,               # HLTV CS2 rankings
    "vlr":              vlr.scrape,                # VLR.gg Valorant
    "twitchtracker":    twitchtracker.scrape,      # Twitch channel rankings
    "liquipedia":       liquipedia.scrape,         # Liquipedia team rosters
    "sullygnome":       sullygnome.scrape,         # SullyGnome rankings
}


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

    parser = argparse.ArgumentParser(description="Instagram target scraper — with IG enrichment")
    parser.add_argument(
        "--sources", nargs="+",
        choices=list(SOURCE_REGISTRY.keys()),
        default=["known_handles"],  # default: curated list only
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-enrich", action="store_true",
                        help="Skip Instagram profile validation (debug only)")
    parser.add_argument("--min-followers", type=int, default=config.MIN_FOLLOWERS)
    parser.add_argument("--max-followers", type=int, default=config.MAX_FOLLOWERS)
    parser.add_argument("--enrich-delay", type=float, default=3.0,
                        help="Seconds between IG profile fetches (default: 3)")
    args = parser.parse_args()

    log.info("=== SocialPro Instagram Target Scraper ===")
    log.info("Sources      : %s", args.sources)
    log.info("Followers    : %d – %d", args.min_followers, args.max_followers)
    log.info("Enrich       : %s", not args.no_enrich)
    log.info("Dry run      : %s", args.dry_run)
    log.info("Batch ID     : %s", config.BATCH_ID)

    fc = FirecrawlClient(
        api_key=config.FIRECRAWL_API_KEY,
        timeout=config.FIRECRAWL_TIMEOUT,
        max_retries=config.MAX_RETRIES,
    )

    # ── Phase 1: collect candidates ───────────────────────────────────────────
    candidates: list[DiscoveredProfile] = []

    for source_key in args.sources:
        scrape_fn = SOURCE_REGISTRY[source_key]
        cfg_entry = config.SOURCES.get(source_key, {})
        if not cfg_entry.get("enabled", True):
            log.info("[%s] disabled in config, skipping", source_key)
            continue

        log.info("─── Source: %s ───", source_key)
        t0 = time.time()
        try:
            profiles = scrape_fn(fc, config)
            elapsed = time.time() - t0
            log.info("[%s] %.1fs → %d candidates", source_key, elapsed, len(profiles))
            candidates.extend(profiles)
        except Exception as exc:
            log.error("[%s] crashed: %s", source_key, exc)

        time.sleep(config.REQUEST_DELAY_SECONDS)

    before_dedup = len(candidates)
    candidates = _dedup(candidates)
    log.info("Candidates after dedup: %d → %d unique", before_dedup, len(candidates))

    if not candidates:
        log.warning("No candidates found. Exiting.")
        sys.exit(0)

    # ── Phase 2: enrich via Instagram ─────────────────────────────────────────
    if args.no_enrich:
        log.warning("Skipping enrichment — follower counts will be 0, no IG validation")
        validated = candidates
    else:
        log.info("─── Enriching %d candidates via Instagram ───", len(candidates))
        # Temporarily override follower filter with CLI args
        config.MIN_FOLLOWERS = args.min_followers
        config.MAX_FOLLOWERS = args.max_followers
        validated = enrich_batch(candidates, fc, config, delay=args.enrich_delay)
        log.info("Validated: %d/%d profiles passed", len(validated), len(candidates))

    if not validated:
        log.warning("No profiles survived enrichment. Exiting.")
        sys.exit(0)

    if args.dry_run:
        log.info("[DRY RUN] Would insert %d profiles. Sample:", len(validated))
        for p in validated[:15]:
            log.info(
                "  @%-28s followers=%-8s niche=%-15s via=%s",
                p.username,
                f"{p.followers:,}" if p.followers else "?",
                p.niche or "?",
                p.discovered_via,
            )
        sys.exit(0)

    # ── Phase 3: write to DB ──────────────────────────────────────────────────
    log.info("Connecting to Neon Postgres…")
    conn = get_connection(config.DATABASE_URL)
    before_count = count_targets(conn)
    log.info("Targets in DB before: %d", before_count)

    inserted, skipped = upsert_profiles(
        conn, validated,
        min_followers=args.min_followers,
        max_followers=args.max_followers,
    )

    after_count = count_targets(conn)
    conn.close()

    log.info("─── Summary ───────────────────────────────")
    log.info("  Candidates found     : %d", len(candidates))
    log.info("  Passed enrichment    : %d", len(validated))
    log.info("  Inserted/updated     : %d", inserted)
    log.info("  Skipped              : %d", skipped)
    log.info("  Targets in DB now    : %d  (+%d)", after_count, after_count - before_count)
    log.info("Done.")


if __name__ == "__main__":
    main()
