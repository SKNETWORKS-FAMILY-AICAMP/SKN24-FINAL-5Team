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

```text
wlighter_streamlit_workflow_v1/
 ├─ app.py
 ├─ checkout.html
 ├─ requirements.txt
 ├─ README.md
 ├─ .env.example
 ├─ .gitignore
 └─ data/
    ├─ rag/
    │  ├─ jp_idiom_references_enriched.json
    │  ├─ th_idiom_references_enriched.json
    │  ├─ us_idiom_references_enriched.json
    │  └─ zh_idiom_references_enriched.json
    └─ localization_guide/
       └─ data/
          ├─ local_data/
          ├─ localization_reports/
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

## 데이터 파일 안내

- `data/rag/`는 국가별 번역/검수 참고자료를 읽는 위치입니다.
- `data/localization_guide/`는 현지화 가이드 리포트 생성에 쓰는 참고자료 위치입니다.
- 원본 수집 데이터 전체를 깃에 올리기 어렵다면 샘플 데이터와 출처 문서만 별도로 정리하는 방식을 권장합니다.

## 수정 반영 내용

- 프로젝트 루트 기준 경로를 `BASE_DIR`, `DATA_DIR`로 정리했습니다.
- `data/rag`, `data/localization_guide` 경로를 절대 경로가 아닌 프로젝트 상대 경로로 정리했습니다.
- `openai` 패키지를 `requirements.txt`에 추가했습니다.
- `.env` 대신 `.env.example`만 포함하도록 정리했습니다.
- optional 파이프라인 모듈이 없어도 앱이 바로 깨지지 않도록 처리했습니다.
- `localization_guide.zip` 자동 압축 해제 시 안전한 경로만 풀리도록 보완했습니다.
- `app.py` 문법 컴파일 검사를 통과하도록 확인했습니다.
