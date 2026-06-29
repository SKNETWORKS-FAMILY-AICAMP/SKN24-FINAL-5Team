from django.conf import settings
from django.db import models

GENRE_CHOICES = [
    ('로맨스', '로맨스'),
    ('판타지', '판타지'),
    ('로맨스 판타지', '로맨스 판타지'),
    ('시대극', '시대극'),
    ('현대 판타지', '현대 판타지'),
    ('무협', '무협'),
    ('SF', 'SF'),
    ('공포', '공포'),
    ('미스터리', '미스터리'),
    ('기타', '기타'),
]


class Work(models.Model):
    work_id  = models.AutoField(primary_key=True)
    user     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='works',
    )
    title    = models.CharField(max_length=50)
    pen_name = models.CharField(max_length=10)
    genre    = models.CharField(max_length=10, choices=GENRE_CHOICES)
    synopsis = models.CharField(max_length=10000, null=True, blank=True)
    cover_image_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'works'


class Episode(models.Model):
    episode_id    = models.AutoField(primary_key=True)
    work          = models.ForeignKey(Work, on_delete=models.CASCADE, db_column='work_id', related_name='episodes')
    episode_number = models.PositiveIntegerField(default=0)
    title         = models.CharField(max_length=30)
    original_text = models.CharField(max_length=8000)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'episodes'
