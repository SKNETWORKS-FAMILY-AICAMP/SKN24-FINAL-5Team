# extract_terms.py
from kiwipiepy import Kiwi
from collections import Counter
import pandas as pd

kiwi = Kiwi()

# 작품 설정어 사전 등록 (NNP=고유명사로 강제)
user_words = ["흑염룡", "천뢰검법", "도윤", "서연"]
for w in user_words:
    kiwi.add_user_word(w, "NNP")

with open("novel_sample.txt", encoding="utf-8") as f:
    text = f.read()

# NNP = 고유명사 태그만 추출
propers = [
    token.form
    for sent in kiwi.analyze(text)
    for token in sent[0]
    if token.tag == "NNP" and len(token.form) > 1
]

df = (
    pd.Series(Counter(propers))
    .sort_values(ascending=False)
    .rename_axis("term")
    .reset_index(name="freq")
)

df.to_csv("termbase_seed_candidates.csv", index=False, encoding="utf-8-sig")
print(f"추출된 고유명사 후보: {len(df)}개")
print(df.head(30))
