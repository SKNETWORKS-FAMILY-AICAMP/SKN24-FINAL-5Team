from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.urls import reverse


class OAuthError(Exception):
    pass


@dataclass(frozen=True)
class OAuthProvider:
    name: str
    label: str
    client_id_setting: str
    client_secret_setting: str
    authorize_url: str
    token_url: str
    user_info_url: str
    scope: str
    client_secret_required: bool = True


PROVIDERS = {
    'google': OAuthProvider(
        name='google',
        label='GOOGLE',
        client_id_setting='GOOGLE_CLIENT_ID',
        client_secret_setting='GOOGLE_CLIENT_SECRET',
        authorize_url='https://accounts.google.com/o/oauth2/v2/auth',
        token_url='https://oauth2.googleapis.com/token',
        user_info_url='https://openidconnect.googleapis.com/v1/userinfo',
        scope='openid email',
    ),
    'kakao': OAuthProvider(
        name='kakao',
        label='KAKAO',
        client_id_setting='KAKAO_CLIENT_ID',
        client_secret_setting='KAKAO_CLIENT_SECRET',
        authorize_url='https://kauth.kakao.com/oauth/authorize',
        token_url='https://kauth.kakao.com/oauth/token',
        user_info_url='https://kapi.kakao.com/v2/user/me',
        scope='account_email',
        client_secret_required=False,
    ),
    'naver': OAuthProvider(
        name='naver',
        label='NAVER',
        client_id_setting='NAVER_CLIENT_ID',
        client_secret_setting='NAVER_CLIENT_SECRET',
        authorize_url='https://nid.naver.com/oauth2.0/authorize',
        token_url='https://nid.naver.com/oauth2.0/token',
        user_info_url='https://openapi.naver.com/v1/nid/me',
        scope='',
    ),
}


def get_provider(provider_name):
    provider = PROVIDERS.get(provider_name)
    if not provider:
        raise OAuthError('지원하지 않는 소셜 로그인입니다.')
    return provider


def get_client_value(provider, setting_name):
    value = getattr(settings, setting_name, '')
    if not value:
        raise OAuthError(f'{provider.label} 로그인 설정이 누락되었습니다.')
    return value


def get_client_secret(provider):
    value = getattr(settings, provider.client_secret_setting, '')
    if not value and provider.client_secret_required:
        raise OAuthError(f'{provider.label} 로그인 설정이 누락되었습니다.')
    return value


def get_redirect_uri(request, provider_name):
    return request.build_absolute_uri(reverse('accounts:oauth_callback', args=[provider_name]))


def build_authorize_url(request, provider_name, state):
    provider = get_provider(provider_name)
    client_id = get_client_value(provider, provider.client_id_setting)
    query = {
        'response_type': 'code',
        'client_id': client_id,
        'redirect_uri': get_redirect_uri(request, provider_name),
        'state': state,
    }
    if provider.scope:
        query['scope'] = provider.scope
    # 항상 계정 선택/로그인 화면 표시 (자동 로그인 방지)
    if provider_name == 'kakao':
        query['prompt'] = 'login'
    elif provider_name == 'google':
        query['prompt'] = 'select_account'
    elif provider_name == 'naver':
        # reauthenticate: 매번 네이버 로그인(계정 선택) 화면 표시 — 카카오 prompt=login 과 동일 역할.
        # reprompt 와 달리 '동의(개인정보 제공)' 화면은 다시 띄우지 않음(이미 동의했으면 건너뜀).
        query['auth_type'] = 'reauthenticate'
    return f'{provider.authorize_url}?{urlencode(query)}'


def request_access_token(request, provider_name, code, state=''):
    provider = get_provider(provider_name)
    data = {
        'grant_type': 'authorization_code',
        'client_id': get_client_value(provider, provider.client_id_setting),
        'redirect_uri': get_redirect_uri(request, provider_name),
        'code': code,
    }
    client_secret = get_client_secret(provider)
    if client_secret:
        data['client_secret'] = client_secret
    if provider_name == 'naver' and state:
        data['state'] = state
    response = requests.post(provider.token_url, data=data, timeout=10)
    if response.status_code >= 400:
        raise OAuthError('소셜 로그인 토큰 발급에 실패했습니다.')

    token_data = response.json()
    access_token = token_data.get('access_token')
    if not access_token:
        raise OAuthError('소셜 로그인 응답에 접근 토큰이 없습니다.')
    return access_token


def request_user_info(provider_name, access_token):
    provider = get_provider(provider_name)
    headers = {'Authorization': f'Bearer {access_token}'}
    if provider_name == 'kakao':
        response = requests.post(
            provider.user_info_url,
            headers={
                **headers,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            data={'property_keys': '["kakao_account.email"]'},
            timeout=10,
        )
    else:
        response = requests.get(
            provider.user_info_url,
            headers=headers,
            timeout=10,
        )
    if response.status_code >= 400:
        raise OAuthError('소셜 계정 정보를 가져오지 못했습니다.')
    return response.json()


def normalize_user_info(provider_name, user_info):
    if provider_name == 'google':
        provider_user_id = user_info.get('sub')
        email = user_info.get('email')
    elif provider_name == 'kakao':
        provider_user_id = user_info.get('id')
        kakao_account = user_info.get('kakao_account') or {}
        email = kakao_account.get('email')
    elif provider_name == 'naver':
        response = user_info.get('response') or {}
        provider_user_id = response.get('id')
        email = response.get('email')
    else:
        raise OAuthError('지원하지 않는 소셜 로그인입니다.')

    if not provider_user_id or not email:
        raise OAuthError('소셜 계정에서 이메일 정보를 가져오지 못했습니다.')

    return {
        'provider': provider_name,
        'oauth_provider': get_provider(provider_name).label,
        'provider_user_id': str(provider_user_id),
        'email': email,
    }
