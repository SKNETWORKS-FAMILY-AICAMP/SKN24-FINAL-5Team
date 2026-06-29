"""FastAPI 모델 서버(3.38.235.44:8000) 호출용 공통 클라이언트.

프론트(브라우저)에서 모델 서버를 직접 부르지 않고, Django 뷰가 이 모듈을 통해
대신 호출한다(프록시 구조). CORS / mixed-content 문제가 없고, 로그인·소유권
확인을 Django 단에서 처리할 수 있다.

엔드포인트 스펙은 '모델 서버 / DB 연동 정보 공유' 문서 기준.
"""
import requests
from django.conf import settings


class ModelServerError(Exception):
    """모델 서버 호출 실패. status_code / payload를 담아 뷰에서 그대로 전달."""

    def __init__(self, message, status_code=502, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}


# 프론트 언어 탭(EN/CN/JP/TH) → 모델 서버 targetCountry 코드
COUNTRY_MAP = {
    'EN': 'US',
    'US': 'US',
    'CN': 'CN',
    'JP': 'JP',
    'TH': 'TH',
    'KR': 'KR',
}

# Work.genre(한글 라벨) → 모델 서버가 기대하는 장르 코드.
# 문서 예시가 '현판'(현대판타지) 형태라 축약 코드로 매핑한다.
GENRE_MAP = {
    '로맨스': '로맨스',
    '판타지': '판타지',
    '로맨스 판타지': '로판',
    '시대극': '시대극',
    '현대 판타지': '현대',
    '무협': '무협',
    'SF': 'SF',
    '공포': '공포',
    '미스터리': '미스터리',
    '기타': '기타',
}


def map_country(code):
    return COUNTRY_MAP.get((code or '').upper(), (code or '').upper())


def map_genre(label):
    return GENRE_MAP.get((label or '').strip(), (label or '').strip())


def work_source_text(work, limit=8000):
    """캐릭터/관계도/가이드 입력용 텍스트.

    줄거리(synopsis)가 있으면 그것을, 없으면 회차 원고를 합쳐서 반환.
    모델 서버가 synopsis(최소 1글자)를 요구하므로 빈 문자열을 피한다.
    """
    text = (getattr(work, 'synopsis', '') or '').strip()
    if not text:
        episodes = work.episodes.order_by('episode_number', 'episode_id')
        text = '\n\n'.join(e.original_text for e in episodes if e.original_text).strip()
    return text[:limit]


def _base_url():
    return getattr(settings, 'MODEL_SERVER_URL', 'http://3.38.235.44:8000').rstrip('/')


def call(path, payload, *, method='POST', timeout=None):
    """모델 서버 엔드포인트 호출 후 JSON(dict) 반환.

    path: '/api/v1/...' 형태. 실패 시 ModelServerError 발생.
    """
    url = f"{_base_url()}{path}"
    read_timeout = timeout or getattr(settings, 'MODEL_SERVER_TIMEOUT', 300)
    # (연결 5초, 응답 read_timeout초) — 연결 실패와 응답 지연을 구분하기 위해 분리
    try:
        resp = requests.request(
            method, url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=(5, read_timeout),
            # 301/302 자동 추적 시 POST→GET으로 깎이고 본문이 유실되므로 끈다.
            allow_redirects=False,
        )
    except requests.exceptions.ConnectTimeout:
        raise ModelServerError(
            '모델 서버에 연결하지 못했습니다(요청이 전달되지 않음). '
            '서버 기동 여부/보안그룹/주소를 확인하세요.',
            status_code=504,
        )
    except requests.exceptions.ReadTimeout:
        raise ModelServerError(
            '모델 서버 응답이 지연됩니다. 잠시 후 새로고침 해 주세요.',
            status_code=504,
        )
    except requests.exceptions.Timeout:
        raise ModelServerError('모델 서버 응답 시간이 초과되었습니다.', status_code=504)
    except requests.exceptions.RequestException as e:
        raise ModelServerError(f'모델 서버에 연결할 수 없습니다: {e}', status_code=502)

    # 리다이렉트(3xx)는 따라가지 않고 그대로 노출 → POST 본문 유실 원인 진단
    if 300 <= resp.status_code < 400:
        loc = resp.headers.get('Location', '(Location 헤더 없음)')
        raise ModelServerError(
            f'모델 서버가 리다이렉트했습니다 (HTTP {resp.status_code} → {loc}). '
            'POST 본문이 유실되는 원인입니다. URL 끝 슬래시 / HTTP·HTTPS / 주소를 확인하세요.',
            status_code=502,
            payload={'redirectTo': loc},
        )

    # 429: Rate limit
    if resp.status_code == 429:
        raise ModelServerError(
            '요청이 많아 잠시 후 다시 시도해 주세요. (429)',
            status_code=429,
        )

    # 본문 파싱(가능하면 JSON)
    try:
        data = resp.json()
    except ValueError:
        data = {'raw': resp.text}

    if resp.status_code >= 400:
        detail = data.get('detail') if isinstance(data, dict) else None
        raise ModelServerError(
            detail or f'모델 서버 오류 (HTTP {resp.status_code})',
            status_code=resp.status_code,
            payload=data if isinstance(data, dict) else {},
        )

    return data


def health():
    """헬스 체크. 살아있으면 True."""
    try:
        resp = requests.get(f"{_base_url()}/health", timeout=10)
        return resp.status_code == 200
    except requests.exceptions.RequestException:
        return False
