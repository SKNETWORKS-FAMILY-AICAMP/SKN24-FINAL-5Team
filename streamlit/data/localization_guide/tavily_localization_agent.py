"""Tavily-only evidence collector for webnovel localization reports.

Usage:
    conda run -n fn_env python tavily_localization_agent.py --country US --max-results 5
    conda run -n fn_env python tavily_localization_agent.py --country all --out raw/tavily_localization_report.md

Environment:
    TAVILY_API_KEY must be available in .env or process env.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from tavily import TavilyClient


ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "raw" / "tavily_cache"
DEFAULT_OUT = ROOT / "raw" / "tavily_localization_report.md"


@dataclass(frozen=True)
class CountrySearchConfig:
    label: str
    tavily_country: str
    queries: tuple[str, ...]
    caveat: str


COUNTRY_CONFIG: dict[str, CountrySearchConfig] = {
    "US": CountrySearchConfig(
        label="미국",
        tavily_country="united states",
        queries=(
            "US webnovel reader preferences romance fantasy tropes 2026",
            "BookTok fantasy romance webnovel trends US readers",
            "Wattpad popular romance fantasy tropes US readers",
            "site:reddit.com/r/RomanceBooks webnovel tropes readers",
        ),
        caveat="영어권 공개 웹문서와 커뮤니티 자료가 많아 Tavily 근거 수집 효율이 높음.",
    ),
    "JP": CountrySearchConfig(
        label="일본",
        tavily_country="japan",
        queries=(
            "日本 Web小説 人気 ジャンル 傾向 2026",
            "小説家になろう 人気 ジャンル 異世界 恋愛 傾向",
            "カクヨム 読者 人気 タグ 傾向",
            "日本 ライトノベル Web小説 読者 好み",
        ),
        caveat="일본어 쿼리 중심으로 수집하되 플랫폼 내부 랭킹 원천 데이터로 표현하지 않음.",
    ),
    "CN": CountrySearchConfig(
        label="중국",
        tavily_country="china",
        queries=(
            "中国 网文 人気 类型 趋势 2026",
            "中国 网络文学 市场 趋势 题材",
            "起点中文网 热门 类型 男频 女频 趋势",
            "China web novel localization censorship cultural sensitivity",
        ),
        caveat="검색 접근성과 플랫폼 폐쇄성 때문에 2차 자료/시장 기사 중심일 가능성이 큼.",
    ),
    "TH": CountrySearchConfig(
        label="태국",
        tavily_country="thailand",
        queries=(
            "Thailand web novel reader preferences romance BL 2026",
            "Thai webnovel platform readAwrite Dek-D fiction trends",
            "นิยายออนไลน์ ไทย แนว ยอดนิยม 2026",
            "Thai readers romance fantasy webnovel trends",
        ),
        caveat="영어+태국어 쿼리를 병행해 공개 자료 기반으로만 판단.",
    ),
}


def require_client() -> TavilyClient:
    load_dotenv(ROOT / ".env")
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY가 .env 또는 환경변수에 없습니다.")
    return TavilyClient(api_key=api_key)


def cache_key(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def cached_search(
    client: TavilyClient,
    *,
    query: str,
    country: str,
    max_results: int,
    refresh: bool,
) -> dict[str, Any]:
    payload = {
        "query": query,
        "country": country,
        "topic": "general",
        "search_depth": "advanced",
        "time_range": "year",
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False,
        "include_usage": True,
    }
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{cache_key(payload)}.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf-8"))

    response = client.search(timeout=30, **payload)
    response["_cached_at"] = datetime.now(timezone.utc).isoformat()
    response["_params"] = payload
    path.write_text(json.dumps(response, ensure_ascii=False, indent=2), encoding="utf-8")
    return response


def collect_country(
    client: TavilyClient,
    code: str,
    *,
    max_results: int,
    refresh: bool,
) -> list[dict[str, Any]]:
    config = COUNTRY_CONFIG[code]
    rows: list[dict[str, Any]] = []

    for query in config.queries:
        response = cached_search(
            client,
            query=query,
            country=config.tavily_country,
            max_results=max_results,
            refresh=refresh,
        )
        for item in response.get("results", []):
            rows.append(
                {
                    "country_code": code,
                    "country_label": config.label,
                    "query": query,
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "content": item.get("content"),
                    "score": item.get("score"),
                }
            )

    return dedupe_by_url(rows)


def dedupe_by_url(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best_by_url: dict[str, dict[str, Any]] = {}
    for row in rows:
        url = row.get("url")
        if not url:
            continue
        old = best_by_url.get(url)
        if old is None or (row.get("score") or 0) > (old.get("score") or 0):
            best_by_url[url] = row
    return sorted(best_by_url.values(), key=lambda x: x.get("score") or 0, reverse=True)


def render_markdown(rows: list[dict[str, Any]], selected_codes: list[str]) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "# Tavily 기반 웹소설 현지화 공개 웹 근거 리포트",
        "",
        f"- 생성일: {now}",
        "- 데이터 성격: Tavily 검색 결과 기반 공개 웹 근거",
        "- 주의: 플랫폼 내부 원천 데이터/전체 독자 데이터로 해석하지 말 것",
        "",
    ]

    for code in selected_codes:
        config = COUNTRY_CONFIG[code]
        country_rows = [row for row in rows if row["country_code"] == code]
        lines.extend(
            [
                f"## {config.label} ({code})",
                "",
                f"**해석 주의**: {config.caveat}",
                "",
                "### 검색 쿼리",
                "",
            ]
        )
        lines.extend(f"- `{query}`" for query in config.queries)
        lines.extend(["", "### 상위 근거", ""])

        if not country_rows:
            lines.extend(["- 수집 결과 없음", ""])
            continue

        for idx, row in enumerate(country_rows[:12], 1):
            score = row.get("score")
            score_text = f"{score:.3f}" if isinstance(score, (int, float)) else "n/a"
            content = (row.get("content") or "").strip().replace("\n", " ")
            if len(content) > 350:
                content = content[:347] + "..."
            lines.extend(
                [
                    f"{idx}. **{row.get('title') or 'Untitled'}**",
                    f"   - URL: {row.get('url')}",
                    f"   - Score: {score_text}",
                    f"   - Query: `{row.get('query')}`",
                    f"   - Snippet: {content}",
                    "",
                ]
            )

    return "\n".join(lines).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect localization evidence with Tavily only.")
    parser.add_argument(
        "--country",
        choices=["all", *COUNTRY_CONFIG.keys()],
        default="all",
        help="Target country code or all.",
    )
    parser.add_argument("--max-results", type=int, default=5, help="Tavily results per query, 0-20.")
    parser.add_argument("--refresh", action="store_true", help="Ignore cache and call Tavily again.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Markdown output path.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.max_results <= 20:
        raise ValueError("--max-results must be between 0 and 20.")

    selected_codes = list(COUNTRY_CONFIG) if args.country == "all" else [args.country]
    client = require_client()
    rows: list[dict[str, Any]] = []
    for code in selected_codes:
        rows.extend(collect_country(client, code, max_results=args.max_results, refresh=args.refresh))

    out_path = args.out if args.out.is_absolute() else ROOT / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # UTF-8 BOM helps Korean Windows tools detect the report encoding correctly.
    out_path.write_text(render_markdown(rows, selected_codes), encoding="utf-8-sig")
    print(f"wrote {out_path}")
    print(f"evidence rows: {len(rows)}")


if __name__ == "__main__":
    main()
