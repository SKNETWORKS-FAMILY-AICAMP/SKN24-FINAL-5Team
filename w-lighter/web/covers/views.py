import json

from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work


@login_required(login_url='pages:landing')
def cover_image(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'covers/cover_image.html', {'works': works})


@login_required(login_url='pages:landing')
def cover_saved(request, work_pk):
    """작품에 저장된 표지 목록(RDS covers)을 반환. 작품 선택 시 그리드 복원용."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    with connection.cursor() as cur:
        cur.execute(
            "SELECT cover_id, cover_url, target_country, main_cover_yn, created_at "
            "FROM covers WHERE work_id = %s ORDER BY cover_id DESC",
            [work.work_id],
        )
        rows = cur.fetchall()
    main_url = (work.cover_image_url or '').strip()
    covers = [{
        'id': r[0], 'url': r[1], 'targetCountry': r[2],
        # 대표 여부 = 현재 작품 대표 표지 URL과 일치하는지
        'isMain': bool(main_url) and r[1] == main_url,
        'createdAt': r[4].strftime('%Y-%m-%d') if r[4] else '',
    } for r in rows]
    return JsonResponse({'ok': True, 'covers': covers})


@login_required(login_url='pages:landing')
@require_POST
def cover_generate(request):
    """표지 생성. 브라우저 → 이 뷰 → FastAPI /cover.

    NOTE: /cover 요청/응답 스키마가 공유 문서에 없어 일반형으로 구현.
    문서상 cover 는 dryRun 파라미터가 있음(rate limit 구분). 실제 필드명 확정 후
    payload / 프론트 렌더링을 맞출 것.
    """
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    work = get_object_or_404(Work, pk=body.get('workId'), user=request.user)

    # 요구사항: 표지는 작품 시놉시스/캐릭터 설정 기반. 시놉시스 없으면 생성 불가.
    synopsis = (work.synopsis or '').strip()
    if not synopsis:
        return JsonResponse({
            'ok': False,
            'error': '이 작품은 시놉시스가 없어 표지를 생성할 수 없습니다. 작품 줄거리를 먼저 입력해주세요.',
        }, status=400)

    # 작품에 저장된 캐릭터 설정집(있으면) 함께 전달
    characters = []
    with connection.cursor() as cur:
        cur.execute(
            "SELECT char_name, `role`, gender, age, appearance, relationships, detail_setting "
            "FROM characters WHERE work_id = %s ORDER BY character_id ASC",
            [work.work_id],
        )
        for r in cur.fetchall():
            characters.append({
                'char_name': r[0], 'role': r[1], 'gender': r[2], 'age': r[3],
                'appearance': r[4], 'relationships': r[5], 'detail_setting': r[6],
            })

    payload = {
        'workId': work.work_id,                      # int (명세)
        'workTitle': work.title,                     # 명세 필드명: workTitle
        'genre': model_server.map_genre(work.genre),
        'synopsis': synopsis,
        'characters': characters,                    # 캐릭터 설정집
        'targetCountry': model_server.map_country(body.get('targetCountry', 'KR')),
        'userPrompt': (body.get('userPrompt') or '')[:500],  # 추가 요청 문구
        'mainCoverYn': bool(body.get('mainCoverYn', False)),
        'saveCover': True,
        'dryRun': bool(body.get('dryRun', False)),
    }
    try:
        data = model_server.call('/api/v1/cover', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({
            'ok': False, 'error': str(e.message),
            'sentPayload': payload, 'detail': e.payload,
        }, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
@require_POST
def cover_delete(request, work_pk):
    """표지 삭제. RDS covers에서 실제로 제거. 대표 표지였다면 작품 대표 URL도 해제."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    cover_id = body.get('coverId')
    if not cover_id:
        return JsonResponse({'ok': False, 'error': 'coverId가 없습니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "SELECT cover_url FROM covers WHERE cover_id = %s AND work_id = %s",
            [cover_id, work.work_id],
        )
        row = cur.fetchone()
        if not row:
            return JsonResponse({'ok': False, 'error': '표지를 찾을 수 없습니다.'}, status=404)
        url = row[0]
        cur.execute(
            "DELETE FROM covers WHERE cover_id = %s AND work_id = %s",
            [cover_id, work.work_id],
        )

    # 삭제한 표지가 작품 대표 표지였다면 대표 지정 해제
    if url and (work.cover_image_url or '').strip() == (url or '').strip():
        work.cover_image_url = None
        work.save(update_fields=['cover_image_url'])

    return JsonResponse({'ok': True})
