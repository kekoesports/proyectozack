"""
Database layer: upsert DiscoveredProfile rows into the `targets` table.
Uses psycopg2 directly (same Neon Postgres DB as the Next.js app).
"""
import logging
from typing import TYPE_CHECKING

import psycopg2
import psycopg2.extras

from scraper.models import DiscoveredProfile

if TYPE_CHECKING:
    from psycopg2.extensions import connection as PgConnection

log = logging.getLogger(__name__)


def get_connection(database_url: str) -> "PgConnection":
    conn = psycopg2.connect(database_url, sslmode="require")
    conn.autocommit = False
    return conn


def upsert_profiles(
    conn: "PgConnection",
    profiles: list[DiscoveredProfile],
    min_followers: int = 0,
    max_followers: int = 0,
) -> tuple[int, int]:
    """
    INSERT into targets; on conflict (platform, username) UPDATE metadata.
    Skips profiles outside the follower range (if followers > 0 are known).

    Returns (inserted_count, skipped_count).
    """
    if not profiles:
        return 0, 0

    inserted = 0
    skipped = 0

    sql = """
        INSERT INTO targets (
            username,
            platform,
            profile_url,
            full_name,
            followers,
            following,
            posts,
            bio,
            external_url,
            profile_pic_url,
            is_verified,
            is_business,
            is_creator,
            is_private,
            business_category,
            status,
            discovered_via,
            import_batch_id,
            updated_at
        ) VALUES (
            %(username)s,
            %(platform)s,
            %(profile_url)s,
            %(full_name)s,
            %(followers)s,
            %(following)s,
            %(posts)s,
            %(bio)s,
            %(external_url)s,
            %(profile_pic_url)s,
            %(is_verified)s,
            %(is_business)s,
            %(is_creator)s,
            %(is_private)s,
            %(business_category)s,
            'pendiente',
            %(discovered_via)s,
            %(import_batch_id)s,
            NOW()
        )
        ON CONFLICT (platform, username)
        DO UPDATE SET
            full_name         = COALESCE(EXCLUDED.full_name, targets.full_name),
            followers         = CASE WHEN EXCLUDED.followers > 0 THEN EXCLUDED.followers ELSE targets.followers END,
            bio               = COALESCE(EXCLUDED.bio, targets.bio),
            external_url      = COALESCE(EXCLUDED.external_url, targets.external_url),
            profile_pic_url   = COALESCE(EXCLUDED.profile_pic_url, targets.profile_pic_url),
            is_verified       = COALESCE(EXCLUDED.is_verified, targets.is_verified),
            is_business       = COALESCE(EXCLUDED.is_business, targets.is_business),
            is_creator        = COALESCE(EXCLUDED.is_creator, targets.is_creator),
            discovered_via    = COALESCE(targets.discovered_via, EXCLUDED.discovered_via),
            import_batch_id   = EXCLUDED.import_batch_id,
            updated_at        = NOW()
        WHERE targets.status = 'pendiente'
    """

    with conn.cursor() as cur:
        for p in profiles:
            # Skip if we know followers and they're outside range
            if p.followers > 0:
                if min_followers > 0 and p.followers < min_followers:
                    skipped += 1
                    continue
                if max_followers > 0 and p.followers > max_followers:
                    skipped += 1
                    continue

            row = {
                "username": p.username,
                "platform": p.platform,
                "profile_url": p.profile_url,
                "full_name": p.full_name,
                "followers": p.followers,
                "following": p.following,
                "posts": p.posts,
                "bio": p.bio,
                "external_url": p.external_url,
                "profile_pic_url": p.profile_pic_url,
                "is_verified": p.is_verified,
                "is_business": p.is_business,
                "is_creator": p.is_creator,
                "is_private": p.is_private,
                "business_category": p.business_category,
                "discovered_via": p.discovered_via,
                "import_batch_id": p.import_batch_id,
            }
            try:
                cur.execute(sql, row)
                inserted += 1
            except Exception as exc:
                log.error("[db] insert failed for @%s: %s", p.username, exc)
                conn.rollback()
                skipped += 1
                continue

    conn.commit()
    return inserted, skipped


def count_targets(conn: "PgConnection") -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM targets WHERE platform = 'instagram'")
        row = cur.fetchone()
        return row[0] if row else 0
