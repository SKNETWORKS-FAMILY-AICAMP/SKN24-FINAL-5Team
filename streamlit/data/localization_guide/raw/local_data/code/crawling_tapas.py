import requests
from bs4 import BeautifulSoup
from pathlib import Path

URL = "https://help.tapas.io/hc/en-us/articles/115005323707-Content-and-Community-Guidelines"
OUTPUT = Path("../usa_tapas_content_guidelines.md")
KEEP_HEADINGS = {
    "Content and Community Guidelines",
    "Code of Conduct",
    "Content Boundaries",
    "Tapas Merch Shop Policy",
    "Reporting and Enforcement",
    "Banned Accounts",
    "Reporting",
    "Feedback",
}

headers = {
    "User-Agent": "Mozilla/5.0 localization-rag/0.1"
}

html = requests.get(URL, headers=headers, timeout=20).text
soup = BeautifulSoup(html, "html.parser")
for tag in soup(["script", "style", "nav", "footer", "header", "form"]):
    tag.decompose()
article = soup.find("article") or soup.find("main") or soup.body
lines = [
    "# Tapas 콘텐츠 및 커뮤니티 가이드라인",
    "",
    f"- source: {URL}",
    "- platform: Tapas",
    "- purpose: 웹소설 현지화 리포트용 콘텐츠 게시 규칙 RAG 자료",
    "",
]
current_heading = None
collecting = False
for el in article.find_all(["h1", "h2", "h3", "p", "li"]):
    text = el.get_text(" ", strip=True)
    if not text:
        continue
    if el.name in ["h1", "h2", "h3"]:
        current_heading = text
        collecting = text in KEEP_HEADINGS
        if collecting:
            level = "#" if el.name == "h1" else "##" if el.name == "h2" else "###"
            lines.append("")
            lines.append(f"{level} {text}")
            lines.append("")
    elif el.name in ["p", "li"]:
        if collecting:
            if len(text) >= 3:
                lines.append(f"- {text}")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
print(f"saved: {OUTPUT}")