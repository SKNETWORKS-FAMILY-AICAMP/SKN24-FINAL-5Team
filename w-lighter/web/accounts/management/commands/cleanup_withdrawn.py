"""탈퇴 후 7일이 지난 회원의 보관 정보(식별자/이메일)를 완전히 삭제.

크론/스케줄러로 매일 1회 실행 권장:
    python manage.py cleanup_withdrawn
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from accounts.views import WITHDRAW_BLOCK_DAYS
from accounts.models import User


class Command(BaseCommand):
    help = '탈퇴 후 7일 경과한 회원 레코드를 삭제합니다.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=WITHDRAW_BLOCK_DAYS)
        qs = User.objects.filter(withdrawn_at__isnull=False, withdrawn_at__lt=cutoff)
        count = qs.count()
        qs.delete()
        self.stdout.write(self.style.SUCCESS(f'탈퇴 {WITHDRAW_BLOCK_DAYS}일 경과 회원 {count}명 삭제 완료'))
