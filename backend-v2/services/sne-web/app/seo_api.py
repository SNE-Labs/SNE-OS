"""
SEO sitemap endpoints for SNE OS public surfaces.
"""

from __future__ import annotations

from datetime import datetime, timezone
from flask import Blueprint, Response

from .collector_client import RADAR_MARKET_UNIVERSE
from .intel_service import fetch_intel_posts

seo_bp = Blueprint("seo", __name__)

SITE_ORIGIN = "https://snelabs.space"
INTEL_TOPICS = ("tech", "economia", "geopolitica", "defi", "infra", "ia", "seguranca", "identidade")


def _iso_day(value: str | None = None) -> str:
    if value:
      try:
          return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
      except Exception:
          pass
    return datetime.now(timezone.utc).date().isoformat()


def _xml_response(xml: str) -> Response:
    return Response(xml, mimetype="application/xml")


def _intel_taxonomy_values(posts: list[dict[str, object]], field: str) -> list[str]:
    values: set[str] = set()
    for post in posts:
        raw = post.get(field)
        if isinstance(raw, list):
            values.update(f"{item}".strip().lower() for item in raw if f"{item}".strip())
    return sorted(values)


@seo_bp.get("/sitemap.xml")
def sitemap_index():
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>{SITE_ORIGIN}/api/seo/core-sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>{SITE_ORIGIN}/api/seo/intel-sitemap.xml</loc>
  </sitemap>
</sitemapindex>
"""
    return _xml_response(xml)


@seo_bp.get("/core-sitemap.xml")
def core_sitemap():
    posts = fetch_intel_posts(limit=120)
    static_urls = [
        (f"{SITE_ORIGIN}/home", "daily", "1.0"),
        (f"{SITE_ORIGIN}/radar", "daily", "0.9"),
        (f"{SITE_ORIGIN}/intel", "hourly", "0.9"),
        (f"{SITE_ORIGIN}/docs", "weekly", "0.7"),
        (f"{SITE_ORIGIN}/pricing", "weekly", "0.7"),
        (f"{SITE_ORIGIN}/status", "daily", "0.6"),
    ]
    topic_values = sorted(set(INTEL_TOPICS).union(_intel_taxonomy_values(posts, "topics")))
    chain_values = _intel_taxonomy_values(posts, "chains")
    asset_values = _intel_taxonomy_values(posts, "assets")

    topic_urls = [(f"{SITE_ORIGIN}/intel/topic/{topic}", "daily", "0.8") for topic in topic_values]
    chain_urls = [(f"{SITE_ORIGIN}/intel/chain/{chain}", "daily", "0.8") for chain in chain_values]
    asset_urls = [(f"{SITE_ORIGIN}/intel/asset/{asset}", "daily", "0.8") for asset in asset_values]
    radar_urls = [(f"{SITE_ORIGIN}/radar/{symbol.lower()}", "hourly", "0.8") for symbol in sorted(RADAR_MARKET_UNIVERSE)]

    rows = []
    for loc, changefreq, priority in [*static_urls, *topic_urls, *chain_urls, *asset_urls, *radar_urls]:
        rows.append(
            f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{_iso_day()}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>"""
        )

    xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
    xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
    xml += "\n".join(rows)
    xml += "\n</urlset>\n"
    return _xml_response(xml)


@seo_bp.get("/intel-sitemap.xml")
def intel_sitemap():
    posts = fetch_intel_posts(limit=120)
    rows = []
    for post in posts:
        slug = post.get("slug")
        if not slug:
            continue
        rows.append(
            f"""  <url>
    <loc>{SITE_ORIGIN}/intel/{slug}</loc>
    <lastmod>{_iso_day(post.get("generated_at"))}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>"""
        )

    xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
    xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
    xml += "\n".join(rows)
    xml += "\n</urlset>\n"
    return _xml_response(xml)
