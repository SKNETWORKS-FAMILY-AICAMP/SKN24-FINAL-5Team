import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Work',
            fields=[
                ('work_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=50)),
                ('pen_name', models.CharField(max_length=10)),
                ('genre', models.CharField(max_length=10)),
                ('synopsis', models.CharField(blank=True, max_length=10000, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(db_column='user_id', on_delete=django.db.models.deletion.CASCADE, related_name='works', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'works'},
        ),
        migrations.CreateModel(
            name='Episode',
            fields=[
                ('episode_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=30)),
                ('original_text', models.CharField(max_length=8000)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('work', models.ForeignKey(db_column='work_id', on_delete=django.db.models.deletion.CASCADE, related_name='episodes', to='works.work')),
            ],
            options={'db_table': 'episodes'},
        ),
    ]
