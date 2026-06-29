import json
from datetime import timezone as dt_timezone

from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work

_COUNTRY_NAME = {'US': '미국', 'EN': '미국', 'CN': '중국', 'JP': '일본', 'TH': '태국', 'KR': '한국'}


@login_required(login_url='pages:landing')
def localization(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'guides/localization.html', {'works': works})


@login_required(login_url='pages:landing')
def guide_saved(request, work_pk):
    """작품에 저장된 현지화 가이드 목록(RDS localization_guides)을 반환."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    with connection.cursor() as cur:
        cur.execute(
            "SELECT guide_id, target_country, guide_content, created_at "
            "FROM localization_guides WHERE work_id = %s ORDER BY guide_id DESC",
            [work.work_id],
        )
        rows = cur.fetchall()
    guides = [{
        'id': r[0],
        'country': r[1] or '',
        'countryName': _COUNTRY_NAME.get((r[1] or '').upper(), ''),
        'htmlReport': r[2],
        'createdAt': timezone.localtime(r[3].replace(tzinfo=dt_timezone.utc) if r[3].tzinfo is None else r[3]).strftime('%Y.%m.%d %H:%M') if r[3] else '',
    } for r in rows]
    return JsonResponse({'ok': True, 'guides': guides})


@login_required(login_url='pages:landing')
@require_POST
def guide_generate(request):
    """현지화 가이드 생성. 브라우저 → 이 뷰 → FastAPI /guide.

    NOTE: /guide 요청/응답 스키마가 공유 문서에 없어 일반형으로 구현.
    실제 필드명 확정 후 payload / 프론트 렌더링을 맞출 것.
    """
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    work = get_object_or_404(Work, pk=body.get('workId'), user=request.user)

    payload = {
        'workId': work.work_id,           # int (명세)
        'title': work.title,
        'genre': model_server.map_genre(work.genre),
        'synopsis': model_server.work_source_text(work),
        'targetCountry': model_server.map_country(body.get('targetCountry', 'EN')),
    }
    try:
        data = model_server.call('/api/v1/guide', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({
            'ok': False, 'error': str(e.message),
            'sentPayload': payload, 'detail': e.payload,
        }, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
@require_POST
def guide_delete(request, work_pk):
    """현지화 가이드 삭제. RDS localization_guides에서 실제로 제거."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    guide_id = body.get('guideId')
    if not guide_id:
        return JsonResponse({'ok': False, 'error': 'guideId가 없습니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM localization_guides WHERE guide_id = %s AND work_id = %s",
            [guide_id, work.work_id],
        )
    return JsonResponse({'ok': True})
