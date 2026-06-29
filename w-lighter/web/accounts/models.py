from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, nickname, oauth_provider, provider_user_id, **extra_fields):
        if not email:
            raise ValueError('이메일은 필수입니다')
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            nickname=nickname,
            oauth_provider=oauth_provider,
            provider_user_id=provider_user_id,
            **extra_fields,
        )
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user_with_bonus(self, email, nickname, oauth_provider, provider_user_id, **extra_fields):
        """가입 시 5000C 웰컴 크레딧 지급 (베타 테스트 기간 한정 4000C 추가)"""
        user = self.create_user(email, nickname, oauth_provider, provider_user_id, **extra_fields)
        user.credit = 5000
        user.save(update_fields=['credit'])
        return user

    def create_superuser(self, email, nickname, password=None, **extra_fields):
        user = self.model(
            email=self.normalize_email(email),
            nickname=nickname,
            oauth_provider='ADMIN',
            provider_user_id='admin',
            is_active=True,
            credit=0,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    OAUTH_CHOICES = [
        ('NAVER', 'NAVER'),
        ('KAKAO', 'KAKAO'),
        ('GOOGLE', 'GOOGLE'),
        ('ADMIN', 'ADMIN'),
    ]

    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=255, unique=True)
    nickname = models.CharField(max_length=10)
    oauth_provider = models.CharField(max_length=10, choices=OAUTH_CHOICES)
    provider_user_id = models.CharField(max_length=255)
    credit = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nickname']

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.nickname} ({self.email})'

    @property
    def is_withdrawn(self):
        return self.withdrawn_at is not None
