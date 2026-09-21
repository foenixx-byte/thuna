from django import forms
from django.conf import settings

from .services import ConversionError, detect_file

OUTPUT_FORMAT_CHOICES = [
    ("", "Same as uploaded"),
    ("Images", (("jpg", "JPG"), ("png", "PNG"), ("webp", "WEBP"), ("bmp", "BMP"), ("tiff", "TIFF"), ("pdf", "PDF"))),
    ("Documents", (("pdf", "PDF"), ("docx", "DOCX"), ("doc", "DOC"), ("txt", "TXT"), ("html", "HTML"), ("xlsx", "XLSX"), ("csv", "CSV"))),
    ("Video", (("mp4", "MP4"), ("mov", "MOV"), ("avi", "AVI"), ("mkv", "MKV"), ("webm", "WEBM"))),
    ("Audio", (("mp3", "MP3"), ("wav", "WAV"), ("m4a", "M4A"), ("aac", "AAC"), ("flac", "FLAC"), ("ogg", "OGG"))),
]


def validate_upload(uploaded):
    max_bytes = getattr(settings, "MAX_UPLOAD_SIZE", 500 * 1024 * 1024)
    if uploaded.size > max_bytes:
        raise forms.ValidationError(f"Files must be {max_bytes // (1024 * 1024)} MB or smaller.")
    try:
        detect_file(uploaded)
    except ConversionError as exc:
        raise forms.ValidationError(str(exc)) from exc
    return uploaded


class UploadForm(forms.Form):
    file = forms.FileField()
    operation = forms.ChoiceField(
        choices=[
            ("compress", "Compress"),
            ("convert", "Convert"),
            ("merge", "Merge"),
            ("zip_create", "Create ZIP"),
        ]
    )
    output_format = forms.ChoiceField(choices=OUTPUT_FORMAT_CHOICES, required=False)
    quality = forms.IntegerField(
        min_value=20,
        max_value=95,
        initial=80,
        required=False,
        widget=forms.NumberInput(attrs={"type": "range", "step": "1"}),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["operation"].widget = forms.HiddenInput()

    def clean_file(self):
        uploaded = self.cleaned_data["file"]
        if self.data.get("operation") == "zip_create":
            max_bytes = getattr(settings, "MAX_UPLOAD_SIZE", 500 * 1024 * 1024)
            if uploaded.size > max_bytes:
                raise forms.ValidationError(f"Files must be {max_bytes // (1024 * 1024)} MB or smaller.")
            return uploaded
        return validate_upload(uploaded)
