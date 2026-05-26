# translate_terms.py

import os, time
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = OpenAI()                   # OPENAI_API_KEY 자동 사용

TYPE_RULES = {
    "인명":   "음역(소리나는 대로). 일관된 표기 유지",
    "지명":   "음역. 단 실제 지명이면 표준 표기 사용",
    "설정어": "의미역(뜻을 살림). 중국어는 한자 거의 그대로",
    "스킬":   "의미역. 한자권은 한자 활용",
}
LANG_NAME = {"EN": "영어", "JA": "일본어", "ZH": "중국어(간체)", "TH": "태국어"}

def llm_translate(term, type_, lang):
    rule = TYPE_RULES.get(type_, "자연스럽게 번역")
    prompt = (
        f"한국어 웹소설 용어를 {LANG_NAME[lang]}로 번역해줘.\n"
        f"용어: {term}\n유형: {type_}\n규칙: {rule}\n"
        f"번역 결과만 출력. 설명·따옴표 없이."
    )
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",     
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return resp.choices[0].message.content.strip()

df = pd.read_csv("termbase_tagged.csv", encoding="utf-8-sig")

for lang in ["EN", "JA", "ZH", "TH"]:
    results = []
    for _, row in df.iterrows():
        results.append(llm_translate(row["term"], row["type"], lang))
        time.sleep(0.3)             # rate limit 여유
    df[lang] = results
    print(f"{lang} 완료")

df.to_csv("termbase_translated.csv", index=False, encoding="utf-8-sig")
print("\n번역 결과:")
print(df.to_string(index=False))