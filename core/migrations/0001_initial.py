import uuid
from django.db import migrations, models
import core.models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="ProcessingJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("session_key", models.CharField(db_index=True, max_length=64)),
                ("operation", models.CharField(max_length=32)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("processing", "Processing"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("original", models.FileField(upload_to=core.models.upload_path)),
                ("result", models.FileField(blank=True, upload_to=core.models.upload_path)),
                ("original_name", models.CharField(max_length=255)),
                ("result_name", models.CharField(blank=True, max_length=255)),
                ("original_size", models.BigIntegerField(default=0)),
                ("result_size", models.BigIntegerField(default=0)),
                ("error_message", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="processingjob", index=models.Index(fields=["session_key", "created_at"], name="core_proces_session_8e9d6e_idx")),
    ]
