# w.LiGHTER Streamlit Workflow v1

웹소설 번역, 감성 현지화, 문화권 검수, 현지화 가이드 리포트, 이미지/관계도 생성을 한 화면에서 확인하기 위한 Streamlit 프로토타입입니다.

## 주요 기능

- 작품 등록 / 목록 조회 / 상세 조회 / 수정 / 삭제
- 회차 등록 및 번역 작업실
- 일반 번역, 감성 현지화 번역, 문화권 검수 요약
- 번역 결과 기반 챗봇 수정 요청
- 국가별 RAG 참고자료 기반 번역/검수 보조
- 현지화 가이드 리포트 생성
- 캐릭터 이미지 및 관계도 생성 테스트
- Toss Payments 테스트 결제 페이지 연동

## 권장 폴더 구조

```## 권장 폴더 구조

```text
streamlit/
 ├─ app.py
 ├─ checkout.html
 ├─ logo.png
 ├─ requirements.txt
 ├─ README.md
 ├─ .env.example
 ├─ .gitignore
 ├─ prompts/
 │  ├─ BASE_REVIEW_PROMPT.md
 │  ├─ CULTURAL_CONSTRAINTS_US.md
 │  ├─ CULTURAL_CONSTRAINTS_CN.md
 │  ├─ CULTURAL_CONSTRAINTS_JP.md
 │  └─ CULTURAL_CONSTRAINTS_TH.md
 └─ data/
    ├─ rag/
    │  ├─ jp_idiom_references_enriched.json
    │  ├─ th_idiom_references_enriched.json
    │  ├─ us_idiom_references_enriched.json
    │  └─ zh_idiom_references_enriched.json
    └─ localization_guide/
       ├─ localization_orchestrator.py
       ├─ tavily_localization_agent.py
       └─ raw/
          ├─ tavily_localization_report_US_smoke.md
          ├─ us_webnovel_localization_guide_goal.html
          ├─ localization_reports/
          ├─ local_data/
          │  ├─ usa_tapas_content_guidelines.md
          │  ├─ usa_wattpad_genre.md
          │  ├─ usa_wattpad_rules.md
          │  ├─ usa_webnovel_guidelines.md
          │  ├─ code/
          │  └─ culture_report/
          └─ tavily_cache/
```


## 설치

```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

## 환경변수 설정

`.env.example`을 복사해 `.env` 파일을 만든 뒤 본인 테스트 키를 입력합니다.

```powershell
copy .env.example .env
```

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2

TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

STREAMLIT_BASE_URL=http://localhost:8501
CHECKOUT_BASE_URL=http://localhost:5500/checkout.html
```

> `.env`는 API 키와 결제 시크릿 키가 들어갈 수 있으므로 깃에 올리지 않습니다.

## 실행

결제 테스트 페이지까지 사용할 경우 터미널을 2개 열어 실행합니다.

### 터미널 1: checkout.html 제공

```powershell
python -m http.server 5500
```

### 터미널 2: Streamlit 실행

```powershell
python -m streamlit run app.py
```
