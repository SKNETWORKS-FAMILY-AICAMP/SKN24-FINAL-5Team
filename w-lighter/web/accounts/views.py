import json
import re
import secrets

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, connection, transaction
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import User

WITHDRAW_BLOCK_DAYS = 7  # 탈퇴 후 재가입 차단 기간
from .oauth import (
    OAuthError,
    build_authorize_url,
    normalize_user_info,
    request_access_token,
    request_user_info,
)


OAUTH_STATE_SESSION_KEY = 'oauth_state'
PENDING_SIGNUP_SESSION_KEY = 'pending_oauth_signup'
SIGNUP_TERMS_AGREED_SESSION_KEY = 'signup_terms_agreed'
NICKNAME_PATTERN = re.compile(r'^[가-힣a-zA-Z0-9]{2,10}$')


def login_user(request, user):
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')


def clear_signup_session(request):
    request.session.pop(PENDING_SIGNUP_SESSION_KEY, None)
    request.session.pop(SIGNUP_TERMS_AGREED_SESSION_KEY, None)
    request.session.modified = True


def get_pending_signup(request):
    return request.session.get(PENDING_SIGNUP_SESSION_KEY)


def redirect_to_landing_with_error(request, message):
    messages.error(request, message)
    return redirect('pages:landing')


PROVIDER_DISPLAY = {
    'GOOGLE': '구글',
    'KAKAO': '카카오',
    'NAVER': '네이버',
}


def find_existing_user(oauth_profile):
    """(제공자+ID) 정확히 일치하는 계정 반환. 없으면 None."""
    return User.objects.filter(
        oauth_provider=oauth_profile['oauth_provider'],
        provider_user_id=oauth_profile['provider_user_id'],
    ).first()


def find_user_by_email(email):
    """이메일로 계정 조회 (중복가입 방지용)."""
    return User.objects.filter(email=email).first()


def oauth_login(request, provider):
    try:
        state = secrets.token_urlsafe(32)
        request.session[OAUTH_STATE_SESSION_KEY] = state
        request.session.modified = True
        return redirect(build_authorize_url(request, provider, state))
    except OAuthError as error:
        return redirect_to_landing_with_error(request, str(error))


def oauth_callback(request, provider):
    error = request.GET.get('error')
    if error:
        return redirect_to_landing_with_error(request, '소셜 로그인이 취소되었습니다.')

    code = request.GET.get('code')
    state = request.GET.get('state')
    saved_state = request.session.pop(OAUTH_STATE_SESSION_KEY, None)
    request.session.modified = True

    if not code or not state or state != saved_state:
        return redirect_to_landing_with_error(request, '소셜 로그인 요청이 올바르지 않습니다.')

    try:
        access_token = request_access_token(request, provider, code, state)
        user_info = request_user_info(provider, access_token)
        oauth_profile = normalize_user_info(provider, user_info)
    except OAuthError as error:
        return redirect_to_landing_with_error(request, str(error))

    # 1. 동일 제공자+ID로 가입된 계정 확인
    existing_user = find_existing_user(oauth_profile)
    if existing_user:
        if existing_user.is_withdrawn:
            if withdraw_block_active(existing_user):
                days_left = WITHDRAW_BLOCK_DAYS - (timezone.now() - existing_user.withdrawn_at).days
                return redirect_to_landing_with_error(
                    request,
                    f'탈퇴한 계정은 {WITHDRAW_BLOCK_DAYS}일간 재가입할 수 없습니다. (약 {max(days_left, 1)}일 남음)'
                )
            # 7일 경과 → 보관 정보 삭제 후 신규 가입 허용
            existing_user.delete()
            existing_user = None
        else:
            login_user(request, existing_user)
            clear_signup_session(request)
            return redirect('works:library')

    # 2. 동일 이메일로 다른 제공자/탈퇴 계정이 존재하는 경우
    email_user = find_user_by_email(oauth_profile['email'])
    if email_user:
        if email_user.is_withdrawn:
            if withdraw_block_active(email_user):
                days_left = WITHDRAW_BLOCK_DAYS - (timezone.now() - email_user.withdrawn_at).days
                return redirect_to_landing_with_error(
                    request,
                    f'탈퇴한 계정은 {WITHDRAW_BLOCK_DAYS}일간 재가입할 수 없습니다. (약 {max(days_left, 1)}일 남음)'
                )
            email_user.delete()  # 7일 경과 → 삭제 후 재가입 허용
        elif email_user.oauth_provider == oauth_profile['oauth_provider']:
            # 같은 제공자 + 같은 이메일 = 동일 사용자.
            # 카카오 앱(REST 키) 변경 등으로 provider_user_id가 달라졌어도
            # 새 id로 갱신한 뒤 기존 계정으로 로그인시킨다.
            if email_user.provider_user_id != oauth_profile['provider_user_id']:
                email_user.provider_user_id = oauth_profile['provider_user_id']
                email_user.save(update_fields=['provider_user_id', 'updated_at'])
            login_user(request, email_user)
            clear_signup_session(request)
            return redirect('works:library')
        else:
            registered_provider = PROVIDER_DISPLAY.get(email_user.oauth_provider, email_user.oauth_provider)
            return redirect_to_landing_with_error(
                request,
                f'이미 {registered_provider}(으)로 가입된 이메일입니다. {registered_provider} 로그인을 이용해 주세요.'
            )

    if request.user.is_authenticated:
        logout(request)

    request.session[PENDING_SIGNUP_SESSION_KEY] = oauth_profile
    request.session.pop(SIGNUP_TERMS_AGREED_SESSION_KEY, None)
    request.session.modified = True
    return redirect('accounts:signup_terms')


def signup_terms(request):
    if request.user.is_authenticated:
        return redirect('works:library')
    if not get_pending_signup(request):
        return redirect_to_landing_with_error(request, '소셜 로그인을 먼저 진행해 주세요.')

    if request.method == 'POST':
        has_required_agreements = (
            request.POST.get('terms_agreed') == 'on'
            and request.POST.get('privacy_agreed') == 'on'
        )
        if not has_required_agreements:
            return render(request, 'accounts/signup_terms.html', {
                'signup_error': '필수 약관에 모두 동의해 주세요.',
            })

        request.session[SIGNUP_TERMS_AGREED_SESSION_KEY] = True
        request.session.modified = True
        return redirect('accounts:signup_name')

    return render(request, 'accounts/signup_terms.html')


def signup_name(request):
    if request.user.is_authenticated:
        return redirect('works:library')

    pending_signup = get_pending_signup(request)
    if not pending_signup:
        return redirect_to_landing_with_error(request, '소셜 로그인을 먼저 진행해 주세요.')
    if not request.session.get(SIGNUP_TERMS_AGREED_SESSION_KEY):
        return redirect('accounts:signup_terms')

    if request.method == 'POST':
        nickname = request.POST.get('nickname', '').strip()
        if not NICKNAME_PATTERN.match(nickname):
            return render(request, 'accounts/signup_name.html', {
                'signup_error': '닉네임은 공백 없이 한글, 영어, 숫자 2~10자로 입력해 주세요.',
                'nickname_value': nickname,
            })

        try:
            with transaction.atomic():
                user = User.objects.create_user_with_bonus(
                    email=pending_signup['email'],
                    nickname=nickname,
                    oauth_provider=pending_signup['oauth_provider'],
                    provider_user_id=pending_signup['provider_user_id'],
                )
                # 가입 축하 5000C 무료 지급 내역 기록 (베타 테스트 기간 한정 4000C 추가)
                from credits.models import CreditTransaction
                CreditTransaction.objects.create(
                    user=user,
                    transaction_type='CHARGE',
                    feature_name='무료 지급',
                    change_amount=5000,
                    balance_after=5000,
                )
        except IntegrityError:
            existing_user = find_existing_user(pending_signup)
            if not existing_user or existing_user.is_withdrawn:
                return render(request, 'accounts/signup_name.html', {
                    'signup_error': '이미 가입된 이메일입니다. 다시 로그인해 주세요.',
                    'nickname_value': nickname,
                })
            user = existing_user

        login_user(request, user)
        clear_signup_session(request)
        request.session['show_beta_bonus'] = True
        return redirect('works:library')

    return render(request, 'accounts/signup_name.html')


@login_required(login_url='pages:landing')
def update_nickname(request):
    if request.method != 'POST':
        from django.http import JsonResponse
        return JsonResponse({'ok': False, 'error': '허용되지 않는 메서드입니다.'}, status=405)
    from django.http import JsonResponse
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'ok': False, 'error': '잘못된 요청입니다.'}, status=400)
    nickname = body.get('nickname', '').strip()
    if not NICKNAME_PATTERN.match(nickname):
        return JsonResponse({'ok': False, 'error': '닉네임은 공백 없이 한글, 영어, 숫자 2~10자로 입력해 주세요.'}, status=400)
    request.user.nickname = nickname
    request.user.save(update_fields=['nickname'])
    return JsonResponse({'ok': True, 'nickname': nickname})


def logout_view(request):
    logout(request)
    clear_signup_session(request)
    return redirect('pages:landing')


def withdraw_block_active(user):
    """탈퇴 후 재가입 차단 기간(7일)이 아직 유효한지."""
    if not user or not getattr(user, 'is_withdrawn', False) or not user.withdrawn_at:
        return False
    return (timezone.now() - user.withdrawn_at).days < WITHDRAW_BLOCK_DAYS


def purge_user_data(user):
    """사용자 데이터 + 대화 내역 삭제 (식별자/이메일은 보관).
    작품·회차(및 모델 서버 테이블)·크레딧 내역을 모두 제거."""
    from works.models import Work, Episode
    work_ids = list(Work.objects.filter(user=user).values_list('work_id', flat=True))
    ep_ids = list(Episode.objects.filter(work__user=user).values_list('episode_id', flat=True))

    with connection.cursor() as cur:
        if ep_ids:
            ph = ','.join(['%s'] * len(ep_ids))
            for sql in [
                "DELETE FROM chat_messages WHERE translation_id IN "
                "(SELECT translation_id FROM translation_results WHERE episode_id IN (%s))" % ph,
                "DELETE FROM translation_results WHERE episode_id IN (%s)" % ph,
            ]:
                try:
                    cur.execute(sql, ep_ids)
                except Exception:
                    pass
        if work_ids:
            ph = ','.join(['%s'] * len(work_ids))
            for table in ['character_images', 'characters', 'covers',
                          'relation_maps', 'localization_guides', 'glossary']:
                try:
                    cur.execute("DELETE FROM %s WHERE work_id IN (%s)" % (table, ph), work_ids)
                except Exception:
                    pass

    try:
        from credits.models import CreditTransaction
        CreditTransaction.objects.filter(user=user).delete()
    except Exception:
        pass

    # 작품 삭제(회차는 FK CASCADE로 함께 삭제)
    Work.objects.filter(user=user).delete()


@ensure_csrf_cookie
@login_required(login_url='pages:landing')
def withdraw(request):
    if request.method == 'POST':
        user = request.user
        try:
            with transaction.atomic():
                purge_user_data(user)
                # 식별자(user_id)·이메일·제공자 정보는 7일 보관, 나머지는 비움
                user.nickname = '탈퇴회원'
                user.credit = 0
                user.is_active = False
                user.withdrawn_at = timezone.now()
                user.save(update_fields=['nickname', 'credit', 'is_active', 'withdrawn_at'])
            logout(request)
            return JsonResponse({'ok': True})
        except Exception:
            return JsonResponse({'ok': False, 'error': '탈퇴 처리에 실패했습니다.'}, status=500)

    user = getattr(request, 'user', None)
    email = user.email if getattr(user, 'is_authenticated', False) else ''
    return render(request, 'accounts/withdraw.html', {
        'withdraw_email': email,
        'is_complete': False,
    })


def withdraw_complete(request):
    return render(request, 'accounts/withdraw.html', {
        'is_complete': True,
    })
