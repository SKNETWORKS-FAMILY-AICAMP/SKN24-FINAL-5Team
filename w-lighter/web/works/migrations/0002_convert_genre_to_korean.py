from django.db import migrations


GENRE_MAP = {
    'romance':         '로맨스',
    'romance_fantasy': '로맨스 판타지',
    'fantasy':         '판타지',
    'modern_fantasy':  '현대물',
    'murim':           '무협',
    'sf':              'SF',
    'etc':             '기타',
}


def convert_genres_to_korean(apps, schema_editor):
    Work = apps.get_model('works', 'Work')
    for work in Work.objects.all():
        korean = GENRE_MAP.get(work.genre)
        if korean:
            work.genre = korean
            work.save(update_fields=['genre'])


def reverse_genres_to_english(apps, schema_editor):
    pass  # 롤백 시 영어 값을 알 수 없으므로 no-op


class Migration(migrations.Migration):

    dependencies = [
        ('works', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(convert_genres_to_korean, reverse_genres_to_english),
    ]
