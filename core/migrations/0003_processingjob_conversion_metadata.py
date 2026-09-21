from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_rename_core_proces_session_8e9d6e_idx_core_proces_session_e60025_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="processingjob",
            name="input_format",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="processingjob",
            name="output_format",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="processingjob",
            name="compression_ratio",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="processingjob",
            name="error_code",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="processingjob",
            name="temporary_path",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="processingjob",
            name="output_path",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name="processingjob",
            name="status",
            field=models.CharField(
                choices=[
                    ("queued", "Queued"),
                    ("pending", "Pending"),
                    ("processing", "Processing"),
                    ("success", "Success"),
                    ("completed", "Completed"),
                    ("failed", "Failed"),
                    ("cancelled", "Cancelled"),
                ],
                default="queued",
                max_length=16,
            ),
        ),
    ]
