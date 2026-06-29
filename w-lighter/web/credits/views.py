import base64
import uuid
from datetime import datetime, timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST
from django.core.paginator import Paginator

from .models import CreditTransaction, Payment, Plan


TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'
TOSS_PENDING_SESSION_KEY = 'toss_pending_payments'

CHARGE_PLANS = {
    'basic': {
        'code': 'basic',
        'name': 'Basic 충전',
        'credit_amount': 10000,
        'price': 9900,
        'description': '가끔 번역을 맡기는 작가분들께 추천해요.',
        'sub_text': '1C당 0.99원',
    },
    'plus': {
        'code': 'plus',
        'name': 'Plus 충전',
        'credit_amount': 35000,
        'price': 29900,
        'description': '꾸준히 연재 중인 작가라면 Plus 충전을 추천해요.',
        'discount_text': '14% 할인',
        'sub_text': '1C당 0.85원',
    },
    'max': {
        'code': 'max',
        'name': 'Max 충전',
        'credit_amount': 75000,
        'price': 49900,
        'description': '장기 연재나 완결을 준비 중인 작가에게 좋아요.',
        'discount_text': '33% 할인',
        'sub_text': '1C당 0.67원',
    },
}

FEATURE_CREDIT_COSTS = {
    'translation': None,            # 번역은 글자수 기반 가변
    'localization_guide': 300,
    'cover_image': 300,
    'relationship_diagram': 300,
    'character_extract': 300,
}

FEATURE_CREDIT_NAMES = {
    'translation': '번역하기',
    'localization_guide': '현지화 가이드',
    'cover_image': '표지 이미지',
    'relationship_diagram': '캐릭터 관계도',
    'character_extract': '캐릭터 설정',
}


def _get_or_create_plan(plan_code):
    plan_data = CHARGE_PLANS[plan_code]
    plan = Plan.objects.filter(
        credit_amount=plan_data['credit_amount'],
        price=plan_data['price'],
    ).first()
    if plan:
        return plan
    return Plan.objects.create(
        credit_amount=plan_data['credit_amount'],
        price=plan_data['price'],
    )


def _plan_context(plan_code):
    plan_data = CHARGE_PLANS[plan_code]
    plan = _get_or_create_plan(plan_code)
    return {
        **plan_data,
        'plan_id': plan.plan_id,
        'price_display': f"{plan_data['price']:,}원",
        'credit_display': f"{plan_data['credit_amount']:,} C",
    }


def _absolute_uri(request, view_name):
    return request.build_absolute_uri(reverse(view_name))


def _payment_notice(request):
    status = request.GET.get('payment')
    if status == 'success':
        return '샌드박스 결제가 승인되어 크레딧이 충전되었습니다.'
    if status == 'fail':
        return request.GET.get('message') or '결제가 완료되지 않았습니다.'
    if status == 'duplicate':
        return '이미 처리된 결제입니다.'
    return ''


def _charge_redirect(payment, message=''):
    query = {'payment': payment}
    if message:
        query['message'] = message
    return redirect(f"{reverse('credits:credit_charge')}?{urlencode(query)}")


@login_required(login_url='pages:landing')
def credit_charge(request):
    plans = [_plan_context(code) for code in ('basic', 'plus', 'max')]
    return render(request, 'credits/credit_charge.html', {
        'plans': plans,
        'toss_client_key': settings.TOSS_CLIENT_KEY,
        'payment_notice': _payment_notice(request),
    })


@login_required(login_url='pages:landing')
@require_POST
def payment_prepare(request):
    plan_code = request.POST.get('plan')
    if plan_code not in CHARGE_PLANS:
        return JsonResponse({'ok': False, 'message': '유효하지 않은 충전 상품입니다.'}, status=400)
    if not settings.TOSS_CLIENT_KEY:
        return JsonResponse({'ok': False, 'message': 'TOSS_CLIENT_KEY가 설정되지 않았습니다.'}, status=500)

    plan_data = CHARGE_PLANS[plan_code]
    plan = _get_or_create_plan(plan_code)
    order_id = f"WLIGHTER-{uuid.uuid4().hex}"
    order_name = f"w.LiGHTER {plan_data['name']} ({plan_data['credit_amount']:,}C)"

    pending_payments = request.session.get(TOSS_PENDING_SESSION_KEY, {})
    pending_payments[order_id] = {
        'plan_code': plan_code,
        'plan_id': plan.plan_id,
        'amount': plan_data['price'],
        'credit_amount': plan_data['credit_amount'],
        'created_at': timezone.now().isoformat(),
    }
    request.session[TOSS_PENDING_SESSION_KEY] = pending_payments
    request.session.modified = True

    return JsonResponse({
        'ok': True,
        'clientKey': settings.TOSS_CLIENT_KEY,
        'customerKey': f"w-lighter-user-{request.user.pk}",
        'orderId': order_id,
        'orderName': order_name,
        'amount': plan_data['price'],
        'currency': 'KRW',
        'successUrl': _absolute_uri(request, 'credits:payment_success'),
        'failUrl': _absolute_uri(request, 'credits:payment_fail'),
        'customerEmail': request.user.email,
        'customerName': request.user.nickname,
    })


@login_required(login_url='pages:landing')
@require_GET
def payment_success(request):
    payment_key = request.GET.get('paymentKey', '')
    order_id = request.GET.get('orderId', '')
    raw_amount = request.GET.get('amount', '')

    try:
        amount = int(raw_amount)
    except (TypeError, ValueError):
        return _charge_redirect('fail', '결제 금액 정보가 올바르지 않습니다.')

    pending_payments = request.session.get(TOSS_PENDING_SESSION_KEY, {})
    pending = pending_payments.get(order_id)
    if not payment_key or not order_id or not pending:
        return _charge_redirect('fail', '결제 요청 정보를 찾을 수 없습니다.')
    if amount != pending['amount']:
        return _charge_redirect('fail', '결제 금액 검증에 실패했습니다.')
    if Payment.objects.filter(payment_id=order_id, user=request.user, status='PAID').exists():
        pending_payments.pop(order_id, None)
        request.session[TOSS_PENDING_SESSION_KEY] = pending_payments
        request.session.modified = True
        return _charge_redirect('duplicate')
    if not settings.TOSS_SECRET_KEY:
        return _charge_redirect('fail', 'TOSS_SECRET_KEY가 설정되지 않았습니다.')

    encoded_secret = base64.b64encode(f"{settings.TOSS_SECRET_KEY}:".encode()).decode()
    response = requests.post(
        TOSS_CONFIRM_URL,
        headers={
            'Authorization': f'Basic {encoded_secret}',
            'Content-Type': 'application/json',
        },
        json={
            'paymentKey': payment_key,
            'orderId': order_id,
            'amount': amount,
        },
        timeout=10,
    )
    if response.status_code != 200:
        try:
            message = response.json().get('message', '결제 승인에 실패했습니다.')
        except ValueError:
            message = '결제 승인에 실패했습니다.'
        return _charge_redirect('fail', message)

    with transaction.atomic():
        if not Payment.objects.filter(payment_id=order_id).exists():
            plan = Plan.objects.select_for_update().get(plan_id=pending['plan_id'])
            user = get_user_model().objects.select_for_update().get(pk=request.user.pk)
            Payment.objects.create(
                payment_id=order_id,
                user=user,
                plan=plan,
                amount=amount,
                status='PAID',
                payment_key=payment_key,
            )
            user.credit += plan.credit_amount
            user.save(update_fields=['credit', 'updated_at'])
            CreditTransaction.objects.create(
                user=user,
                transaction_type='CHARGE',
                feature_name='크레딧 충전',
                change_amount=plan.credit_amount,
                balance_after=user.credit,
            )

    pending_payments.pop(order_id, None)
    request.session[TOSS_PENDING_SESSION_KEY] = pending_payments
    request.session.modified = True
    return _charge_redirect('success')


@login_required(login_url='pages:landing')
@require_GET
def payment_fail(request):
    message = request.GET.get('message') or '결제가 취소되었거나 실패했습니다.'
    return _charge_redirect('fail', message)


@login_required(login_url='pages:landing')
@require_POST
def credit_use(request):
    feature = request.POST.get('feature', '')
    if feature not in FEATURE_CREDIT_COSTS:
        return JsonResponse({'ok': False, 'message': '유효하지 않은 크레딧 사용 요청입니다.'}, status=400)

    fixed_amount = FEATURE_CREDIT_COSTS[feature]
    if fixed_amount is None:
        try:
            amount = int(request.POST.get('amount', '0'))
        except (TypeError, ValueError):
            amount = 0
    else:
        amount = fixed_amount

    if amount <= 0:
        return JsonResponse({'ok': False, 'message': '사용할 크레딧 금액이 올바르지 않습니다.'}, status=400)

    with transaction.atomic():
        user = get_user_model().objects.select_for_update().get(pk=request.user.pk)
        if user.credit < amount:
            return JsonResponse({
                'ok': False,
                'message': '크레딧이 부족합니다.',
                'required': amount,
                'balance': user.credit,
            }, status=402)

        user.credit -= amount
        user.save(update_fields=['credit', 'updated_at'])
        CreditTransaction.objects.create(
            user=user,
            transaction_type='USE',
            feature_name=FEATURE_CREDIT_NAMES[feature],
            change_amount=-amount,
            balance_after=user.credit,
        )

    return JsonResponse({
        'ok': True,
        'used': amount,
        'balance': user.credit,
        'feature': feature,
    })


@login_required(login_url='pages:landing')
@require_POST
def payment_cancel_demo(request):
    payment_id = request.POST.get('payment_id', '')
    if not payment_id:
        return JsonResponse({'ok': False, 'message': '결제 정보를 찾을 수 없습니다.'}, status=400)

    with transaction.atomic():
        payment = (
            Payment.objects
            .select_for_update()
            .select_related('plan', 'user')
            .filter(payment_id=payment_id, user=request.user)
            .first()
        )
        if not payment:
            return JsonResponse({'ok': False, 'message': '결제 정보를 찾을 수 없습니다.'}, status=404)
        if payment.status == 'CANCELED':
            return JsonResponse({'ok': True, 'status': 'CANCELED', 'message': '이미 취소 완료 상태입니다.'})
        if payment.status != 'PAID':
            return JsonResponse({'ok': False, 'message': '취소할 수 없는 결제 상태입니다.'}, status=400)
        if payment.user.credit < payment.plan.credit_amount:
            return JsonResponse({
                'ok': False,
                'status': 'NOT_CANCELABLE',
                'message': '충전한 크레딧 중 일부를 사용해 취소할 수 없습니다.',
            }, status=409)

        user = payment.user
        user.credit -= payment.plan.credit_amount
        user.save(update_fields=['credit', 'updated_at'])
        payment.status = 'CANCELED'
        payment.save(update_fields=['status', 'updated_at'])
        CreditTransaction.objects.create(
            user=user,
            transaction_type='CANCEL',
            feature_name='구매 취소',
            change_amount=-payment.plan.credit_amount,
            balance_after=user.credit,
        )

    return JsonResponse({
        'ok': True,
        'status': 'CANCELED',
        'balance': user.credit,
        'canceled_credit': payment.plan.credit_amount,
        'message': '샌드박스 데모에서 취소 완료 상태로 변경했습니다.',
    })


@login_required(login_url='pages:landing')
def credit_history(request):
    tab       = request.GET.get('tab', 'charge')
    page      = request.GET.get('page', 1)
    date_from = request.GET.get('date_from', '')
    date_to   = request.GET.get('date_to', '')
    cutoff    = timezone.now() - timedelta(hours=24)
    today     = timezone.now()

    df = dt = None
    if date_from:
        try:
            df = datetime.strptime(date_from, '%Y-%m-%d').date()
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            pass

    payments_qs = Payment.objects.filter(user=request.user).select_related('plan').order_by('-created_at')
    bonuses_qs  = (
        CreditTransaction.objects
        .filter(user=request.user, transaction_type='CHARGE')
        .exclude(feature_name='크레딧 충전')
        .order_by('-created_at')
    )

    if df:
        payments_qs = payments_qs.filter(created_at__date__gte=df)
        bonuses_qs  = bonuses_qs.filter(created_at__date__gte=df)
    if dt:
        payments_qs = payments_qs.filter(created_at__date__lte=dt)
        bonuses_qs  = bonuses_qs.filter(created_at__date__lte=dt)

    charge_rows = []
    for p in payments_qs:
        paid_credit_remaining = request.user.credit >= p.plan.credit_amount
        charge_rows.append({
            'kind':          'payment',
            'created_at':    p.created_at,
            'label':         f'{p.plan.credit_amount:,}C 충전',
            'credit_amount': p.plan.credit_amount,
            'price':         p.amount,
            'status':        p.status,
            'payment_id':    p.payment_id,
            'cancelable':    p.status == 'PAID' and paid_credit_remaining,
            'cancel_blocked_by_use': p.status == 'PAID' and not paid_credit_remaining,
        })
    for b in bonuses_qs:
        charge_rows.append({
            'kind':          'bonus',
            'created_at':    b.created_at,
            'label':         b.feature_name,
            'credit_amount': b.change_amount,
            'price':         0,
            'status':        'FREE',
        })
    charge_rows.sort(key=lambda r: r['created_at'], reverse=True)

    usages_qs = CreditTransaction.objects.filter(user=request.user, transaction_type='USE').order_by('-created_at')
    if df:
        usages_qs = usages_qs.filter(created_at__date__gte=df)
    if dt:
        usages_qs = usages_qs.filter(created_at__date__lte=dt)

    charges_page = Paginator(charge_rows, 10).get_page(page if tab == 'charge' else 1)
    usages_page  = Paginator(usages_qs,   10).get_page(page if tab == 'usage'  else 1)

    return render(request, 'credits/credit_history.html', {
        'charges':    charges_page,
        'usages':     usages_page,
        'cutoff':     cutoff,
        'active_tab': tab,
        'today':      today,
        'date_from':  date_from,
        'date_to':    date_to,
    })
