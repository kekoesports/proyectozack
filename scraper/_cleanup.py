import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper import config
from scraper.db import get_connection, count_targets

conn = get_connection(config.DATABASE_URL)
with conn.cursor() as cur:
    cur.execute("DELETE FROM targets WHERE import_batch_id = 'scrape-2026-04'")
    deleted = cur.rowcount
conn.commit()
n = count_targets(conn)
conn.close()
print(f"Deleted {deleted} targets. Instagram targets remaining: {n}")
