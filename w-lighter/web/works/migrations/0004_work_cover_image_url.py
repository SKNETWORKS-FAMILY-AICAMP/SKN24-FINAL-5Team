from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('works', '0003_alter_work_genre'),
    ]

    operations = [
        migrations.AddField(
            model_name='work',
            name='cover_image_url',
            field=models.TextField(blank=True, null=True),
        ),
    ]
