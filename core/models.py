import uuid
from django.db import models


def upload_path(instance, filename):
    return f"uploads/{instance.session_key}/{uuid.uuid4().hex}_{filename}"


class ProcessingJob(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCESS = "success", "Success"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    session_key = models.CharField(max_length=64, db_index=True)
    operation = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.QUEUED)
    original = models.FileField(upload_to=upload_path)
    result = models.FileField(upload_to=upload_path, blank=True)
    original_name = models.CharField(max_length=255)
    result_name = models.CharField(max_length=255, blank=True)
    input_format = models.CharField(max_length=32, blank=True)
    output_format = models.CharField(max_length=32, blank=True)
    original_size = models.BigIntegerField(default=0)
    result_size = models.BigIntegerField(default=0)
    compression_ratio = models.FloatField(null=True, blank=True)
    error_code = models.CharField(max_length=64, blank=True)
    error_message = models.CharField(max_length=255, blank=True)
    temporary_path = models.CharField(max_length=500, blank=True)
    output_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["session_key", "created_at"])]

    @property
    def saved_size(self):
        return max(0, self.original_size - self.result_size)
