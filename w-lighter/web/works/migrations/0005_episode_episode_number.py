from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('works', '0004_work_cover_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='episode',
            name='episode_number',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
