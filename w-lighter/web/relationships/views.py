import json
import re

from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from common import model_server
from works.models import Work


@login_required(login_url='pages:landing')
def relationship(request):
    works = Work.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'relationships/relationship.html', {'works': works})


@login_required(login_url='pages:landing')
def relationship_saved(request, work_pk):
    """작품에 저장된 관계도 목록(RDS relation_maps)을 반환. version 부여(생성순)."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    with connection.cursor() as cur:
        cur.execute(
            "SELECT map_id, map_content, created_at "
            "FROM relation_maps WHERE work_id = %s ORDER BY map_id ASC",
            [work.work_id],
        )
        rows = cur.fetchall()
    maps = []
    for i, r in enumerate(rows):
        content = r[1] or ''
        # 구버전 HTML 서빙 패치: requestAnimationFrame 없는 경우 오버레이 강제 표시
        if content and 'requestAnimationFrame' not in content and '</body>' in content:
            patch = (
                '<script>(function(){'
                'setTimeout(function(){'
                'document.querySelectorAll("#cy>div").forEach(function(d){'
                'if(d.style&&d.style.pointerEvents==="none")d.style.opacity="1";'
                '});'
                'if(!window.__relReadySent){'
                'window.__relReadySent=true;'
                'window.parent.postMessage({type:"rel-ready"},"*");}'
                '},900);'
                '})();</script>'
            )
            content = content.replace('</body>', patch + '</body>')
        # opacity:0 노드 패치 → background-opacity:0 으로 복구 (엣지 연결 복구)
        if "'opacity': 0," in content and 'background-opacity' not in content:
            content = content.replace(
                "'opacity': 0,\n          'label': ''",
                "'background-opacity': 0,\n          'border-width': 0,\n          'label': ''"
            )
        maps.append({
            'id': r[0],
            'version': i + 1,
            'content': content,
            'createdAt': r[2].strftime('%Y.%m.%d %H:%M') if r[2] else '',
        })
    return JsonResponse({'ok': True, 'maps': maps})


@login_required(login_url='pages:landing')
@require_POST
def relationship_map(request):
    """관계도 생성. 브라우저 → 이 뷰 → FastAPI /relationship-map.

    NOTE: /relationship-map 요청/응답 스키마가 공유 문서에 없어 일반형으로 구현.
    실제 필드명 확정 후 payload / 프론트 렌더링을 맞출 것.
    """
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    work = get_object_or_404(Work, pk=body.get('workId'), user=request.user)

    # 요구사항: 관계도는 캐릭터 설정(=시놉시스 기반)에서 생성. 시놉시스 없으면 생성 불가.
    synopsis = (work.synopsis or '').strip()
    if not synopsis:
        return JsonResponse({
            'ok': False,
            'error': '이 작품은 시놉시스가 없어 관계도를 생성할 수 없습니다. 작품 줄거리를 먼저 입력해주세요.',
        }, status=400)

    payload = {
        'workId': work.work_id,
        'workTitle': work.title,
        'includeHtml': True,
        'characters': body.get('characters', []),
    }

    # characterIds(['ch_0','ch_1',...]) → DB에서 전체 캐릭터 정보 조회 후 필터링
    character_ids = body.get('characterIds', [])
    if character_ids and not payload['characters']:
        indices = set()
        for cid in character_ids:
            if isinstance(cid, str) and cid.startswith('ch_'):
                try:
                    indices.add(int(cid[3:]))
                except ValueError:
                    pass
        if indices:
            with connection.cursor() as cur:
                cur.execute(
                    "SELECT char_name, role, profile_label, age, gender, "
                    "appearance, relationships, detail_setting "
                    "FROM characters WHERE work_id = %s ORDER BY character_id ASC",
                    [work.work_id],
                )
                all_chars = cur.fetchall()
            payload['characters'] = [
                {
                    'char_name': row[0] or '',
                    'role': row[1] or '',
                    'profile_label': row[2] or '',
                    'age': row[3] or '',
                    'gender': row[4] or '',
                    'appearance': row[5] or '',
                    'relationships': row[6] or '',
                    'detail_setting': row[7] or '',
                }
                for i, row in enumerate(all_chars)
                if i in indices
            ]
    try:
        data = model_server.call('/api/v1/relationship-map', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({
            'ok': False, 'error': str(e.message),
            'sentPayload': payload, 'detail': e.payload,
        }, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
@require_POST
def relationship_delete(request, work_pk):
    """관계도 삭제. RDS relation_maps에서 실제로 제거."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    map_id = body.get('mapId')
    if not map_id:
        return JsonResponse({'ok': False, 'error': 'mapId가 없습니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM relation_maps WHERE map_id = %s AND work_id = %s",
            [map_id, work.work_id],
        )
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
@require_POST
def relationship_positions(request, work_pk):
    """노드 드래그 위치 저장. map_content 내 __REL_POSITIONS__ 값을 교체."""
    work = get_object_or_404(Work, pk=work_pk, user=request.user)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    map_id = body.get('mapId')
    positions = body.get('positions')
    if not map_id or not isinstance(positions, dict):
        return JsonResponse({'ok': False, 'error': 'mapId 또는 positions가 없습니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "SELECT map_content FROM relation_maps WHERE map_id = %s AND work_id = %s",
            [map_id, work.work_id],
        )
        row = cur.fetchone()

    if not row:
        return JsonResponse({'ok': False, 'error': '관계도를 찾을 수 없습니다.'}, status=404)

    positions_json = json.dumps(positions, ensure_ascii=False)

    # 위치 데이터 교체
    content = re.sub(
        r'window\.__REL_POSITIONS__\s*=\s*[^;]+;',
        f'window.__REL_POSITIONS__={positions_json};',
        row[0],
    )

    # 구버전 HTML 자동 패치 ①: overlay 트랜지션 제거
    content = content.replace(
        'pointer-events:none;opacity:0;transition:opacity .3s;',
        'pointer-events:none;opacity:0;',
    )

    # 구버전 HTML 자동 패치 ②: requestAnimationFrame + setTimeout 추가
    if 'requestAnimationFrame' not in content:
        content = re.sub(
            r"updateCards\(\);[\s\S]*?window\.parent\.postMessage\(\{[\s\S]*?'rel-ready'[\s\S]*?\}\s*,\s*'\*'\s*\);",
            "cy.fit(cy.nodes(), 80);\n    requestAnimationFrame(function() {\n      updateCards();\n      overlay.style.opacity = '1';\n      setTimeout(function() {\n        window.parent.postMessage({ type: 'rel-ready' }, '*');\n      }, 50);\n    });",
            content,
        )

    with connection.cursor() as cur:
        cur.execute(
            "UPDATE relation_maps SET map_content = %s WHERE map_id = %s AND work_id = %s",
            [content, map_id, work.work_id],
        )
    return JsonResponse({'ok': True})