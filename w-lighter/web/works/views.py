import json

from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Max
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.utils.timesince import timesince
from django.views.decorators.http import require_POST

from common import model_server
from .models import Episode, Work

# 모델 서버 target_country → 프론트 언어 탭
_COUNTRY_TO_LANG = {'US': 'EN', 'EN': 'EN', 'CN': 'CN', 'JP': 'JP', 'TH': 'TH', 'KR': 'KR'}


@login_required(login_url='pages:landing')
def library(request):
    # 작품별 최근 시각: 회차 created_at/updated_at 최댓값도 함께 집계
    works = list(
        Work.objects.filter(user=request.user)
        .annotate(
            latest_ep_created=Max('episodes__created_at'),
            latest_ep_updated=Max('episodes__updated_at'),
        )
        .order_by('-created_at')
    )

    # 작품별 번역 회차 수 + 번역 언어 계산 (translation_results)
    work_ids = [w.work_id for w in works]
    eps_by_work = {}   # work_id -> set(episode_id)  (번역된 회차)
    langs_by_work = {}  # work_id -> set(lang)
    if work_ids:
        placeholders = ','.join(['%s'] * len(work_ids))
        with connection.cursor() as cur:
            cur.execute(
                "SELECT e.work_id, t.episode_id, t.target_country "
                "FROM episodes e JOIN translation_results t ON t.episode_id = e.episode_id "
                "WHERE e.work_id IN (%s)" % placeholders,
                work_ids,
            )
            for work_id, ep_id, country in cur.fetchall():
                eps_by_work.setdefault(work_id, set()).add(ep_id)
                lang = _COUNTRY_TO_LANG.get((country or '').upper(), None)
                if lang:
                    langs_by_work.setdefault(work_id, set()).add(lang)

    def _aware(dt):
        if dt and timezone.is_naive(dt):
            return timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    lang_order = ['EN', 'CN', 'JP', 'TH']
    for w in works:
        w.trans_ep_count = len(eps_by_work.get(w.work_id, set()))
        w.trans_langs = [l for l in lang_order if l in langs_by_work.get(w.work_id, set())]
        # 최근 업데이트: 작품 등록·수정, 회차 등록·수정 중 가장 최근 시각
        candidates = [
            w.created_at,                          # 작품 등록
            _aware(w.updated_at),                  # 작품 수정
            _aware(w.latest_ep_created),           # 회차 등록
            _aware(w.latest_ep_updated),           # 회차 수정
        ]
        w.last_update = max((t for t in candidates if t), default=w.created_at)
        # 단위 1개만 표시(예: "10일 전")
        w.last_update_str = timesince(w.last_update).split(',')[0].strip() if w.last_update else ''

    # 최근 작업: 내 모든 작품 중 가장 최근에 번역한 회차
    recent = None
    if work_ids:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT e.work_id, w.title, e.episode_number, e.episode_id, t.created_at "
                "FROM translation_results t "
                "JOIN episodes e ON t.episode_id = e.episode_id "
                "JOIN works w ON e.work_id = w.work_id "
                "WHERE w.user_id = %s ORDER BY t.created_at DESC LIMIT 1",
                [request.user.user_id],
            )
            row = cur.fetchone()
            if row:
                ep = Episode.objects.filter(pk=row[3]).first()
                recent = {
                    'work_id': row[0], 'work_title': row[1],
                    # 번역하기 페이지와 동일한 기준으로 회차 번호 표시
                    'episode_number': _episode_number(ep) if ep else row[2],
                    'episode_id': row[3],
                }

    show_beta_bonus = request.session.pop('show_beta_bonus', False)

    return render(request, 'works/library.html', {
        'works': works,
        'nickname': request.user.nickname,
        'recent': recent,
        'show_beta_bonus': show_beta_bonus,
    })


@login_required(login_url='pages:landing')
@require_POST
def work_create(request):
    title    = request.POST.get('title', '').strip()
    pen_name = request.POST.get('author', '').strip()
    genre    = request.POST.get('genre', '').strip()
    synopsis = request.POST.get('synopsis', '').strip() or None

    errors = {}
    if not title:    errors['title']  = '작품 제목을 입력해주세요'
    if not pen_name: errors['author'] = '필명을 입력해주세요'
    if not genre:    errors['genre']  = '장르를 선택해주세요'
    if errors:
        return JsonResponse({'ok': False, 'errors': errors})

    work = Work.objects.create(user=request.user, title=title, pen_name=pen_name,
                               genre=genre, synopsis=synopsis)
    return JsonResponse({'ok': True, 'work': {
        'id': work.work_id, 'title': work.title,
        'pen_name': work.pen_name, 'genre': work.genre,
        'synopsis': work.synopsis or '',
    }})


@login_required(login_url='pages:landing')
@require_POST
def work_update(request, pk):
    work     = get_object_or_404(Work, pk=pk, user=request.user)
    title    = request.POST.get('title', '').strip()
    pen_name = request.POST.get('author', '').strip()
    genre    = request.POST.get('genre', '').strip()
    synopsis = request.POST.get('synopsis', '').strip() or None

    errors = {}
    if not title:    errors['title']  = '작품 제목을 입력해주세요'
    if not pen_name: errors['author'] = '필명을 입력해주세요'
    if not genre:    errors['genre']  = '장르를 선택해주세요'
    if errors:
        return JsonResponse({'ok': False, 'errors': errors})

    work.title = title; work.pen_name = pen_name
    work.genre = genre; work.synopsis = synopsis
    work.save()
    return JsonResponse({'ok': True, 'work': {
        'id': work.work_id, 'title': work.title,
        'pen_name': work.pen_name, 'genre': work.genre,
    }})


@login_required(login_url='pages:landing')
@require_POST
def work_delete(request, pk):
    work = get_object_or_404(Work, pk=pk, user=request.user)
    work.delete()
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
def work_detail(request, pk):
    work = get_object_or_404(Work, pk=pk, user=request.user)
    # 회차번호 오름차순 기본 정렬
    episodes = list(work.episodes.all().order_by('episode_number', 'episode_id'))
    episode_count = len(episodes)

    # 회차별 번역 완료 언어(translation_results) 계산
    ep_ids = [e.episode_id for e in episodes]
    trans_map = {}
    if ep_ids:
        placeholders = ','.join(['%s'] * len(ep_ids))
        with connection.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT episode_id, target_country "
                "FROM translation_results WHERE episode_id IN (%s)" % placeholders,
                ep_ids,
            )
            for ep_id, country in cur.fetchall():
                lang = _COUNTRY_TO_LANG.get((country or '').upper(), None)
                if lang:
                    trans_map.setdefault(ep_id, set()).add(lang)

    lang_order = ['EN', 'CN', 'JP', 'TH']
    translated_count = 0
    for e in episodes:
        langs = trans_map.get(e.episode_id, set())
        e.trans_langs = [l for l in lang_order if l in langs]  # 정렬된 언어 목록
        if e.trans_langs:
            translated_count += 1

    return render(request, 'works/work_detail.html', {
        'work': work, 'episodes': episodes, 'episode_count': episode_count,
        'translated_count': translated_count,
        'untranslated_count': episode_count - translated_count,
    })


def _episode_number(episode):
    # 등록 시 입력한 회차 번호를 우선 사용. 없으면(0) 생성 순서로 대체.
    if getattr(episode, 'episode_number', 0):
        return episode.episode_number
    return Episode.objects.filter(
        work=episode.work, episode_id__lte=episode.episode_id).count()


@login_required(login_url='pages:landing')
def episode_detail(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    ep_num  = _episode_number(episode)
    return render(request, 'works/episode_detail.html', {
        'work': work, 'episode': episode, 'ep_num': ep_num,
    })


@login_required(login_url='pages:landing')
def episode_translate(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    ep_num  = _episode_number(episode)
    return render(request, 'works/episode_translate.html', {
        'work': work, 'episode': episode, 'ep_num': ep_num,
    })


@login_required(login_url='pages:landing')
def episode_edit(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    if request.method == 'POST':
        title         = request.POST.get('title', '').strip()[:30]
        original_text = request.POST.get('content', '').strip()[:8000]
        errors = {}
        if not title:         errors['title']   = '회차 제목을 입력해주세요'
        if not original_text: errors['content'] = '원문을 입력해주세요'
        if errors:
            return JsonResponse({'ok': False, 'errors': errors})
        episode.title = title; episode.original_text = original_text
        episode.save()
        return JsonResponse({'ok': True})

    ep_num = _episode_number(episode)
    return render(request, 'works/episode_edit.html', {
        'work': work, 'episode': episode, 'ep_num': ep_num,
    })


@login_required(login_url='pages:landing')
@require_POST
def episode_delete(request, work_pk, episode_pk):
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    episode.delete()
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
def episode_register(request, work_pk):
    work = get_object_or_404(Work, pk=work_pk, user=request.user)

    if request.method == 'POST':
        title          = request.POST.get('title', '').strip()[:30]
        original_text  = request.POST.get('content', '').strip()[:8000]
        episode_number = request.POST.get('episode_number', '0').strip()
        errors = {}
        if not title:         errors['title']   = '회차 제목을 입력해주세요'
        if not original_text: errors['content'] = '원문을 입력해주세요'
        if errors:
            return JsonResponse({'ok': False, 'errors': errors})

        ep_num = int(episode_number) if episode_number.isdigit() else 0
        # 중복 회차 번호 거절
        if ep_num and work.episodes.filter(episode_number=ep_num).exists():
            return JsonResponse({
                'ok': False,
                'error': f'{ep_num}화는 이미 등록된 회차입니다.',
                'duplicate': ep_num,
            }, status=409)

        episode = Episode.objects.create(
            work=work, title=title, original_text=original_text,
            episode_number=ep_num,
        )
        return JsonResponse({'ok': True, 'episode': {
            'id': episode.episode_id, 'title': episode.title,
            'episode_number': episode.episode_number,
        }})

    episode_count = work.episodes.count()
    existing_numbers = list(
        work.episodes.values_list('episode_number', flat=True)
    )
    return render(request, 'works/episode_register.html', {
        'work': work, 'episode_count': episode_count,
        'existing_numbers': existing_numbers,
    })

@login_required(login_url='pages:landing')
@require_POST
def work_set_cover(request, pk):
    work = get_object_or_404(Work, pk=pk, user=request.user)
    url  = request.POST.get('url', '').strip()
    work.cover_image_url = url or None
    work.save(update_fields=['cover_image_url'])
    return JsonResponse({'ok': True})


# ===== 모델 서버(FastAPI) 연동 프록시 =====

@login_required(login_url='pages:landing')
@require_POST
def episode_translate_run(request, work_pk, episode_pk):
    """번역 실행. 브라우저 → 이 뷰 → FastAPI /translation/translate."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    target_country = model_server.map_country(body.get('targetCountry', 'EN'))
    payload = {
        'episodeId': str(episode.episode_id),
        'sourceText': episode.original_text,
        'targetCountry': target_country,
        'genre': model_server.map_genre(work.genre),
        'includeInternal': bool(body.get('includeInternal', False)),
        'saveTranslationResult': True,
    }

    # 프론트에서 보낸 applied 고유명사가 있으면 payload에 포함
    glossary_terms = body.get('glossaryTerms')
    if isinstance(glossary_terms, list) and glossary_terms:
        payload['glossaryTerms'] = [
            g for g in glossary_terms
            if isinstance(g, dict) and g.get('source')
        ]

    try:
        data = model_server.call('/api/v1/translation/translate', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({'ok': False, 'error': e.message}, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
@require_POST
def episode_inspect_chat(request, work_pk, episode_pk):
    """검수 챗봇. 브라우저 → 이 뷰 → FastAPI /translation/inspect-chat."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    message = (body.get('message') or '').strip()
    if not message:
        return JsonResponse({'ok': False, 'error': '메시지를 입력해주세요.'}, status=400)

    # 현재 번역문(선택된 버전)을 함께 보내야 모델이 수정안(proposedTranslation)을 제시함
    current_translation = ''
    translation_id = body.get('translationId')
    if translation_id:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT translated_text FROM translation_results "
                "WHERE translation_id = %s AND episode_id = %s",
                [translation_id, episode.episode_id],
            )
            row = cur.fetchone()
            if row:
                current_translation = row[0] or ''

    # 모델 서버 제한: 원문 8000자 / 번역본 24000자 (번역본은 원문보다 길어 분리 상향)
    current_translation = current_translation[:24000]
    source_text = (episode.original_text or '')[:8000]

    payload = {
        'episodeId': str(episode.episode_id),
        'question': message,
        'targetCountry': model_server.map_country(body.get('targetCountry', 'EN')),
        'genre': model_server.map_genre(work.genre),
        'sourceText': source_text,
        'currentTranslation': current_translation,
        'translatedText': current_translation,
    }
    if translation_id:
        try:
            payload['translationId'] = int(translation_id)
        except (TypeError, ValueError):
            payload['translationId'] = translation_id
    payload['workId'] = str(work.work_id)
    pending_action = body.get('pendingAction')
    if pending_action and isinstance(pending_action, dict):
        payload['pendingAction'] = pending_action
    try:
        data = model_server.call('/api/v1/translation/inspect-chat', payload)
    except model_server.ModelServerError as e:
        return JsonResponse({'ok': False, 'error': e.message}, status=e.status_code)

    return JsonResponse({'ok': True, 'result': data})


@login_required(login_url='pages:landing')
def episode_translations(request, work_pk, episode_pk):
    """이 회차에 저장된 번역 목록(RDS translation_results)을 반환.
    페이지 로드 시 버전 목록/번역본 복원에 사용."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)

    def _json(v):
        if not v:
            return None
        try:
            return json.loads(v) if isinstance(v, str) else v
        except (ValueError, TypeError):
            return None

    with connection.cursor() as cur:
        cur.execute(
            "SELECT translation_id, target_country, translated_text, summary, "
            "inspection_report, annotation_can, glossary_can, created_at "
            "FROM translation_results "
            "WHERE episode_id = %s "
            # 번역 실패/타임아웃으로 내용이 빈 row는 버전으로 취급하지 않음
            "AND translated_text IS NOT NULL AND TRIM(translated_text) <> '' "
            "ORDER BY translation_id ASC",
            [episode.episode_id],
        )
        rows = cur.fetchall()

        # 작품 단위 확정 glossary 조회 (언어별)
        cur.execute(
            "SELECT target_country, original_word, translated_word "
            "FROM glossary WHERE work_id = %s",
            [work.work_id],
        )
        confirmed_rows = cur.fetchall()

    # target_country → set of original_word
    confirmed_by_lang = {}
    for tc, ow, tw in confirmed_rows:
        lang = _COUNTRY_TO_LANG.get((tc or '').upper(), tc)
        if lang not in confirmed_by_lang:
            confirmed_by_lang[lang] = []
        confirmed_by_lang[lang].append({'source': ow, 'target': tw})

    items = []
    for r in rows:
        lang = _COUNTRY_TO_LANG.get((r[1] or '').upper(), 'EN')
        items.append({
            'id': r[0],
            'lang': lang,
            'translatedText': r[2],
            'summary': r[3],
            'inspectionReport': _json(r[4]),      # 전체 decisions 배열(웹이 cultural 필터)
            'readerEndnotes': _json(r[5]),        # annotation_can
            'glossaryCandidates': _json(r[6]),    # glossary_can
            'createdAt': r[7].strftime('%Y.%m.%d %H:%M') if r[7] else '',
        })
    return JsonResponse({'ok': True, 'items': items, 'confirmedGlossary': confirmed_by_lang})


@login_required(login_url='pages:landing')
def episode_chat(request, work_pk, episode_pk):
    """특정 번역 버전(translation_id)에 저장된 검수 챗봇 대화 반환."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    translation_id = request.GET.get('translation_id')
    if not translation_id:
        return JsonResponse({'ok': True, 'messages': []})

    with connection.cursor() as cur:
        cur.execute(
            "SELECT c.sender_type, c.message_text, c.created_at "
            "FROM chat_messages c "
            "JOIN translation_results t ON c.translation_id = t.translation_id "
            "WHERE c.translation_id = %s AND t.episode_id = %s "
            "ORDER BY c.message_id ASC",
            [translation_id, episode.episode_id],
        )
        rows = cur.fetchall()

    messages = [{
        'sender': r[0],
        'text': r[1],
        'createdAt': r[2].strftime('%Y.%m.%d %H:%M') if r[2] else '',
    } for r in rows]
    return JsonResponse({'ok': True, 'messages': messages})


@login_required(login_url='pages:landing')
@require_POST
def episode_translation_save(request, work_pk, episode_pk):
    """수정된 번역본을 해당 버전(translation_id)에 덮어쓰기 저장."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    tid  = body.get('translationId')
    text = (body.get('translatedText') or '').strip()
    if not tid or not text:
        return JsonResponse({'ok': False, 'error': '번역 버전과 내용이 필요합니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "UPDATE translation_results SET translated_text = %s "
            "WHERE translation_id = %s AND episode_id = %s",
            [text, tid, episode.episode_id],
        )
        affected = cur.rowcount
    if affected == 0:
        return JsonResponse({'ok': False, 'error': '해당 번역본을 찾을 수 없습니다.'}, status=404)
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
@require_POST
def episode_translation_delete(request, work_pk, episode_pk):
    """번역본 버전 삭제 (+ 그 버전의 챗봇 대화도 삭제)."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    tid = body.get('translationId')
    if not tid:
        return JsonResponse({'ok': False, 'error': '번역 버전이 필요합니다.'}, status=400)

    with connection.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM translation_results WHERE translation_id = %s AND episode_id = %s",
            [tid, episode.episode_id],
        )
        if not cur.fetchone():
            return JsonResponse({'ok': False, 'error': '해당 번역본을 찾을 수 없습니다.'}, status=404)
        cur.execute("DELETE FROM chat_messages WHERE translation_id = %s", [tid])
        cur.execute(
            "DELETE FROM translation_results WHERE translation_id = %s AND episode_id = %s",
            [tid, episode.episode_id],
        )
    return JsonResponse({'ok': True})


@login_required(login_url='pages:landing')
@require_POST
def episode_report_check_save(request, work_pk, episode_pk):
    """리포트 체크박스(applied) 상태를 DB에 저장."""
    work    = get_object_or_404(Work, pk=work_pk, user=request.user)
    episode = get_object_or_404(Episode, pk=episode_pk, work=work)
    try:
        body = json.loads(request.body or '{}')
    except ValueError:
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)

    tid     = body.get('translationId')
    kind    = body.get('type')        # 'glossary' | 'endnote'
    idx     = body.get('idx')
    applied = body.get('applied')     # True | False

    if tid is None or kind not in ('glossary', 'endnote') or idx is None or applied is None:
        return JsonResponse({'ok': False, 'error': '파라미터가 부족합니다.'}, status=400)

    col = 'glossary_can' if kind == 'glossary' else 'annotation_can'

    with connection.cursor() as cur:
        cur.execute(
            f"SELECT {col} FROM translation_results "
            "WHERE translation_id = %s AND episode_id = %s",
            [tid, episode.episode_id],
        )
        row = cur.fetchone()
        if not row:
            return JsonResponse({'ok': False, 'error': '번역본을 찾을 수 없습니다.'}, status=404)

        try:
            items = json.loads(row[0] or '[]')
        except (ValueError, TypeError):
            items = []

        idx = int(idx)
        if 0 <= idx < len(items):
            if isinstance(items[idx], dict):
                items[idx]['applied'] = 1 if applied else 0

        cur.execute(
            f"UPDATE translation_results SET {col} = %s "
            "WHERE translation_id = %s AND episode_id = %s",
            [json.dumps(items, ensure_ascii=False), tid, episode.episode_id],
        )

        # glossary 체크 시 작품 단위 glossary 테이블에도 저장/해제
        if kind == 'glossary':
            idx_int = int(idx)
            item = items[idx_int] if 0 <= idx_int < len(items) else None
            if item:
                # target_country 조회
                cur.execute(
                    "SELECT target_country FROM translation_results WHERE translation_id = %s",
                    [tid],
                )
                tr_row = cur.fetchone()
                target_country = (tr_row[0] if tr_row else '').upper()
                original_word  = (item.get('source') or item.get('original_word') or '').strip()
                translated_word = (item.get('suggested_target') or item.get('translated_word') or '').strip()
                # glossary_type CHECK 제약(person/place/organization) 충족 — 모델이 준 category 사용,
                # 비었거나 이상값이면 안전 기본값(person). dedup엔 무관(original_word 기준)이라 분류 라벨일 뿐.
                category = (item.get('category') or item.get('glossary_type') or '').strip().lower()
                if category not in ('person', 'place', 'organization'):
                    category = 'person'

                if original_word and target_country:
                    if applied:
                        # 이미 있으면 UPDATE, 없으면 INSERT
                        cur.execute(
                            "SELECT glossary_id FROM glossary "
                            "WHERE work_id = %s AND target_country = %s AND original_word = %s",
                            [work.work_id, target_country, original_word],
                        )
                        existing = cur.fetchone()
                        if existing:
                            cur.execute(
                                "UPDATE glossary SET translated_word = %s "
                                "WHERE glossary_id = %s",
                                [translated_word, existing[0]],
                            )
                        else:
                            cur.execute(
                                "INSERT INTO glossary "
                                "(work_id, target_country, original_word, translated_word, glossary_type) "
                                "VALUES (%s, %s, %s, %s, %s)",
                                [work.work_id, target_country, original_word, translated_word, category],
                            )
                    else:
                        cur.execute(
                            "DELETE FROM glossary "
                            "WHERE work_id = %s AND target_country = %s AND original_word = %s",
                            [work.work_id, target_country, original_word],
                        )

    return JsonResponse({'ok': True})
