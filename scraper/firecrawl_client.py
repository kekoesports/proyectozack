"""
Thin wrapper around firecrawl-py SDK.
Handles retries, timeouts, and normalises the response format.
"""
import logging
import time
from typing import Any

from firecrawl import FirecrawlApp

log = logging.getLogger(__name__)


class FirecrawlClient:
    def __init__(self, api_key: str, timeout: int = 30, max_retries: int = 3) -> None:
        self._app = FirecrawlApp(api_key=api_key)
        self._timeout = timeout
        self._max_retries = max_retries

    def scrape(self, url: str, formats: list[str] | None = None) -> dict[str, Any]:
        """
        Scrape a single URL and return a normalised dict with keys:
          - markdown: str
          - html: str
          - content: str (alias for markdown)
          - metadata: dict
        """
        if formats is None:
            formats = ["markdown"]

        last_exc: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                result = self._app.scrape(
                    url,
                    formats=formats,
                    timeout=self._timeout * 1000,  # SDK expects ms
                )
                # Normalise: firecrawl-py v4 returns a Pydantic Document
                if hasattr(result, "markdown"):
                    # v4 Pydantic model — access attributes directly
                    md = result.markdown or ""
                    data = {
                        "markdown": md,
                        "content": md,
                        "metadata": result.metadata if hasattr(result, "metadata") else {},
                    }
                elif isinstance(result, dict):
                    md = result.get("markdown") or result.get("content") or ""
                    data = result
                    data["markdown"] = md
                    data["content"] = md
                else:
                    md = str(result)
                    data = {"markdown": md, "content": md}
                return data

            except Exception as exc:
                last_exc = exc
                log.warning(
                    "[firecrawl] attempt %d/%d failed for %s: %s",
                    attempt,
                    self._max_retries,
                    url,
                    exc,
                )
                if attempt < self._max_retries:
                    time.sleep(2 ** attempt)  # exponential back-off

        raise RuntimeError(
            f"[firecrawl] all {self._max_retries} attempts failed for {url}"
        ) from last_exc

    def crawl(self, url: str, limit: int = 10) -> list[dict[str, Any]]:
        """
        Crawl a site and return a list of page results (same shape as scrape()).
        Useful for sites with multiple sub-pages (e.g. streamer directories).
        """
        try:
            result = self._app.crawl_url(
                url,
                limit=limit,
                scrape_options={"formats": ["markdown"]},
            )
            pages = []
            if hasattr(result, "data"):
                raw_pages = result.data or []
            elif isinstance(result, dict):
                raw_pages = result.get("data", [])
            else:
                raw_pages = []

            for page in raw_pages:
                if hasattr(page, "__dict__"):
                    page = page.__dict__
                md = page.get("markdown") or page.get("content") or ""
                page["markdown"] = md
                page["content"] = md
                pages.append(page)
            return pages

        except Exception as exc:
            log.error("[firecrawl] crawl failed for %s: %s", url, exc)
            return []
