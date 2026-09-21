import shutil

from django.core.management.base import BaseCommand

from core.services import HEIF_AVAILABLE, binary_setting, module_available


class Command(BaseCommand):
    help = "Report available THUNA file conversion engines."

    def handle(self, *args, **options):
        checks = [
            ("Pillow", module_available("PIL")),
            ("PyMuPDF", module_available("pymupdf") or module_available("fitz")),
            ("python-docx", module_available("docx")),
            ("openpyxl", module_available("openpyxl")),
            ("python-pptx", module_available("pptx")),
            ("FFmpeg", self.has_binary(binary_setting("FFMPEG_BINARY", "ffmpeg"))),
            ("FFprobe", self.has_binary(binary_setting("FFPROBE_BINARY", "ffprobe"))),
            ("LibreOffice", self.has_binary(binary_setting("LIBREOFFICE_BINARY", "libreoffice")) or self.has_binary("soffice")),
            ("Tesseract", self.has_binary(binary_setting("TESSERACT_BINARY", "tesseract"))),
            ("pytesseract", module_available("pytesseract")),
            ("pillow-heif", HEIF_AVAILABLE),
            ("Celery", module_available("celery")),
            ("Redis", module_available("redis")),
        ]
        for name, available in checks:
            mark = "OK" if available else "Not installed"
            style = self.style.SUCCESS if available else self.style.WARNING
            self.stdout.write(f"{name}: {style(mark)}")

    @staticmethod
    def has_binary(binary):
        return bool(shutil.which(binary))
