# 기여 가이드 (CONTRIBUTING)

> w.LiGHTER 팀 협업 규칙

---

## 환경 설정

### 사전 요구사항

- Git
- Miniconda (또는 Anaconda)
- MySQL 8.0
- Node.js 18+ (Frontend 작업 시)

### 최초 설정

```bash
# 1) 클론
cd C:\skn24
git clone https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN24-FINAL-5Team.git
cd SKN24-FINAL-5Team

# 2) 가상환경
conda create -n fn_env python=3.12 -y
conda activate fn_env

# 3) MySQL 클라이언트 (Windows)
conda install -c conda-forge mysqlclient -y

# 4) 패키지 설치
cd backend
pip install -r requirements/dev.txt

# 5) 환경변수
cd ..
copy .env.example .env
# .env 파일에 DB_PASSWORD, OPENAI_API_KEY 입력

# 6) DB 생성
mysql -u root -p
# mysql> CREATE DATABASE wlighter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# mysql> exit;

# 7) 마이그레이션
cd backend
python manage.py migrate

# 8) 서버 확인
python manage.py runserver
# http://127.0.0.1:8000/ 접속 확인 후 Ctrl+C
```

---

## Git 브랜치 전략

```
main ──────────────────────────── 배포용 (직접 푸시 금지)
  └── dev ─────────────────────── 개발 통합 (PR로만 merge)
        ├── feature/accounts
        ├── feature/translation
        ├── feature/works
        ├── feature/credits
        ├── feature/characters
        ├── feature/guides
        ├── feature/rag
        └── feature/frontend
```

### 규칙

1. `main`에 직접 푸시하지 않는다.
2. `dev`에도 직접 푸시하지 않는다. 반드시 **PR(Pull Request)**을 통해 merge한다.
3. 기능 브랜치는 `feature/앱이름` 또는 `feature/기능설명` 형식으로 만든다.
4. PR merge 전 최소 1명의 리뷰를 받는다.

### 작업 흐름

```bash
# 1) dev에서 최신 코드 받기
git checkout dev
git pull origin dev

# 2) 기능 브랜치 생성
git checkout -b feature/내작업이름

# 3) 작업 & 커밋 (여러 번 가능)
git add .
git commit -m "feat: 기능 설명"

# 4) 원격에 push
git push origin feature/내작업이름

# 5) GitHub에서 PR 생성 (feature/내작업이름 → dev)

# 6) 리뷰 후 merge

# 7) 로컬 정리
git checkout dev
git pull origin dev
git branch -d feature/내작업이름
```

---

## 커밋 메시지 규칙

형식: `타입: 설명`

| 타입 | 용도 | 예시 |
|------|------|------|
| feat | 새 기능 | `feat: 소셜 로그인 구현` |
| fix | 버그 수정 | `fix: 번역 토큰 카운팅 오류 수정` |
| docs | 문서 | `docs: API 엔드포인트 목록 추가` |
| style | 포맷팅 | `style: black 포맷 적용` |
| refactor | 리팩토링 | `refactor: 번역 서비스 레이어 분리` |
| test | 테스트 | `test: 크레딧 차감 유닛 테스트 추가` |
| chore | 설정/환경 | `chore: requirements.txt 업데이트` |

### 주의사항

- 한글로 작성해도 됩니다.
- 한 커밋에 한 가지 작업만 담습니다.
- `feat: 이것저것 수정` 같은 모호한 메시지를 피합니다.

---

## 코드 컨벤션

### Python (Backend)

- 포맷터: `black`
- import 정렬: `isort`
- 린터: `flake8`
- 변수/함수: `snake_case`
- 클래스: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`

### JavaScript (Frontend)

- 변수/함수: `camelCase`
- 컴포넌트: `PascalCase`
- 파일명: 컴포넌트는 `PascalCase.jsx`, 유틸은 `camelCase.js`

---

## PR 규칙

1. PR 제목: `[앱이름] 작업 설명` (예: `[translation] 번역 엔진 서비스 레이어 구현`)
2. PR 템플릿을 빠짐없이 작성한다.
3. `.env`, API 키, 비밀번호가 포함된 커밋이 없는지 확인한다.
4. `python manage.py runserver`가 에러 없이 작동하는지 확인한 후 PR을 올린다.
5. 마이그레이션 파일이 포함된 경우 PR 설명에 명시한다.

---

## 자주 쓰는 명령어

```bash
# 가상환경
conda activate fn_env

# Django
cd backend
python manage.py runserver           # 서버 실행
python manage.py makemigrations      # 마이그레이션 생성
python manage.py migrate             # 마이그레이션 적용
python manage.py createsuperuser     # 관리자 계정
python manage.py shell               # Django 쉘

# 코드 품질
black .                              # 코드 포맷팅
isort .                              # import 정렬
flake8 .                             # 린트 검사

# Frontend
cd frontend
npm install                          # 패키지 설치
npm run dev                          # 개발 서버
```
