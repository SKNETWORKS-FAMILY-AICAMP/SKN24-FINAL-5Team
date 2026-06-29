import json
import logging

from django.contrib.auth.decorators import login_required
from django.db import connection, transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work

logger = logging.getLogger(__name__)

# characters 테이블 제약: gender 는 'M' / 'F' / 'U' 만 허용
_GENDER_DISPLAY = {'M': '남성', 'F': '여성', 'U': '미상'}


def _gender_code(g):
    g = (g or '').strip()
    if g in ('M', '남', '남성', 'male', 'Male', 'MALE'):
        return 'M'
    if g in ('F', '여', '여성', 'female', 'Female', 'FEMALE'):
        return 'F'
    return 'U'


def _save_characters(work, chars):
    """모델 서버 저장이 제약조건 위반으로 실패하므로 Django가 직접 저장(작품 기준 교체).
    gender는 M/F/Unknown으로 변환해 넣는다."""
    if not chars:
        return
    try:
        with transaction.atomic():
            with connection.cursor() as cur:
                cur.execute("DELETE FROM characters WHERE work_id = %s", [work.work_id])
                for c in chars:
                    cur.execute(
                        "INSERT INTO characters "
                        "(work_id, char_name, gender, age, `role`, appearance, relationships, detail_setting, profile_label) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        [
                            work.work_id,
                            (c.get('char_name') or '')[:30],
                            _gender_code(c.get('gender')),
                            (c.get('age') or '')[:10],
                            (c.get('role') or '')[:5],
                            (c.get('appearance') or '')[:300],
                            (c.get('relationships') or '')[:500],
                            (c.get('detail_setting') or '')[:1000],
                            (c.get('profile_label') or '')[:80],   # ← 추가
                        ],
                    )
    except Exception as e:
        logger.warning('character save failed (work %s): %s', work.work_id, e)


@login_required(login_url='pages:landing')
def character_list(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'characters/character_list.html', {'works': works})


@login_required(login_url='pages:landing')
def character_saved(request, work_pk):
    """작품에 저장된 캐릭터 목록(RDS characters)을 반환. 작품 선택 시 표 복원용."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    with connection.cursor() as cur:
        cur.execute(
            "SELECT char_name, age, gender, role, appearance, detail_setting, relationships, profile_label "
            "FROM characters WHERE work_id = %s ORDER BY character_id ASC",
            [work.work_id],
        )
        rows = cur.fetchall()
    characters = [{
        'char_name': r[0], 'age': r[1],
        'gender': _GENDER_DISPLAY.get(r[2], r[2]),  # M/F/Unknown → 한국어
        'role': r[3],
        'appearance': r[4], 'detail_setting': r[5], 'relationships': r[6],
        'profile_label': r[7],   # ← 추가
    } for r in rows]
    return JsonResponse({'ok': True, 'characters': characters})


@login_required(login_url='pages:landing')
@require_POST
def character_save(request, work_pk):
    """현재 표(추가/수정/삭제 반영된 전체 캐릭터 목록)를 RDS에 저장(작품 기준 교체).
    빈 목록이면 해당 작품 캐릭터를 모두 삭제한다."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    chars = body.get('characters')
    if not isinstance(chars, list):
        return JsonResponse({'ok': False, 'error': 'characters 형식 오류'}, status=400)

    if chars:
        _save_characters(work, chars)
    else:
        # 전부 삭제된 경우
        try:
            with transaction.atomic():
                with connection.cursor() as cur:
                    cur.execute("DELETE FROM characters WHERE work_id = %s", [work.work_id])
        except Exception as e:
            logger.warning('character delete-all failed (work %s): %s', work.work_id, e)
            return JsonResponse({'ok': False, 'error': '저장에 실패했습니다.'}, status=500)

    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
@require_POST
def character_extract(request):
    """캐릭터 설정 추출. 브라우저 → 이 뷰 → FastAPI /character-extract.

    NOTE: /character-extract 의 요청/응답 스키마가 공유 문서에 없어 일반형으로 구현.
    실제 필드명이 확정되면 payload / 프론트 렌더링을 맞춰야 함.
    """
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    work = get_object_or_404(Work, pk=body.get('workId'), user=request.user)

    # 요구사항: 캐릭터 설정은 작품의 시놉시스를 기반으로 생성한다.
    # 시놉시스가 없으면 생성을 막는다.
    synopsis = (work.synopsis or '').strip()
    if not synopsis:
        return JsonResponse({
            'ok': False,
            'error': '이 작품은 시놉시스가 없어 캐릭터 설정을 생성할 수 없습니다. 작품 줄거리를 먼저 입력해주세요.',
        }, status=400)

    payload = {
        'workId': work.work_id,           # int (명세)
        'workTitle': work.title,
        'genre': model_server.map_genre(work.genre),
        'synopsis': synopsis,
    }
    try:
        data = model_server.call('/api/v1/character-extract', payload)
    except model_server.ModelServerError as e:
        # 구조 확인용: 보낸 payload와 모델 서버의 에러 본문(detail)을 함께 반환
        return JsonResponse({
            'ok': False,
            'error': str(e.message),
            'sentPayload': payload,
            'detail': e.payload,
        }, status=e.status_code)

    # 모델 서버 저장이 제약조건 위반으로 실패하므로 Django가 직접 저장
    _save_characters(work, (data or {}).get('characters') or [])

    return JsonResponse({'ok': True, 'result': data})
