import requests
from bs4 import BeautifulSoup
from pathlib import Path

URL = "https://creators.wattpad.com/writing-resources/get-started-on-wattpad/categorizing-your-story-on-wattpad/"

OUTPUT = Path("../wattpad_genre_rules.md")

GENRE_H2 = {
    "Fiction",
    "Fiction Subgenres",
    "Fanfiction",
    "Non-Fiction",
    "Poetry",
    "Type",
}

headers = {
    "User-Agent": "Mozilla/5.0 localization-rag/0.1"
}

html = requests.get(URL, headers=headers, timeout=20).text
soup = BeautifulSoup(html, "html.parser")
for tag in soup(["script", "style", "nav", "footer", "header"]):
    tag.decompose()
main = soup.find("main") or soup.find("article") or soup.body
lines = [
    "# Wattpad 장르 분류 가이드",
    "",
    f"- source: {URL}",
    "- platform: Wattpad",
    "- purpose: 웹소설 현지화 리포트용 장르/카테고리 RAG 자료",
    "",
]
current_h2 = None
current_h4 = None
for el in main.find_all(["h2", "h4", "p", "li"]):
    text = el.get_text(" ", strip=True)
    if not text:
        continue
    if el.name == "h2":
        current_h2 = text
        current_h4 = None
        if current_h2 in GENRE_H2:
            lines.append("")
            lines.append(f"## {current_h2}")
            lines.append("")
    elif el.name == "h4":
        if current_h2 in GENRE_H2:
            current_h4 = text
            lines.append("")
            lines.append(f"### {current_h4}")
            lines.append("")
    elif el.name in ["p", "li"]:
        if current_h2 in GENRE_H2:
            # 너무 짧은 메뉴/잡텍스트 방지
            if len(text) >= 3:
                lines.append(f"- {text}")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
print(f"saved: {OUTPUT}")