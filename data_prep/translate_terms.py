# translate_terms.py

import time
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, AuthenticationError, OpenAIError

BASE = Path(__file__).resolve().parent
load_dotenv(BASE.parent / ".env") 


IN_CSV = BASE / "termbase_tagged.csv"
OUT_CSV = BASE / "termbase_translated.csv"

# --- 입력 파일 존재 확인 ---
if not IN_CSV.exists():
    raise SystemExit(
        f"[중단] 입력 파일이 없습니다: {IN_CSV}\n"
        f"먼저 태깅 단계를 실행해 termbase_tagged.csv를 만드세요."
    )

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

df = pd.read_csv(IN_CSV, encoding="utf-8-sig")

# 필수 컬럼 확인 (freq 유무는 상관 없음)
for col in ("term", "type"):
    if col not in df.columns:
        raise SystemExit(f"[중단] 입력 csv에 '{col}' 컬럼이 없습니다. 현재 컬럼: {list(df.columns)}")

try:
    for lang in ["EN", "JA", "ZH", "TH"]:
        results = []
        for _, row in df.iterrows():
            results.append(llm_translate(row["term"], row["type"], lang))
            time.sleep(0.3)                # rate limit 여유
        df[lang] = results
        print(f"{lang} 완료")
except AuthenticationError:
    raise SystemExit(
        "[중단] OpenAI 인증 실패. .env의 OPENAI_API_KEY가 유효한지 확인하세요."
    )
except OpenAIError as e:
    raise SystemExit(f"[중단] OpenAI 호출 오류: {e}")

df.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")
print(f"\n저장 완료: {OUT_CSV}")
print(df.to_string(index=False))

