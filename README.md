# THUNA

THUNA is a Django + Tailwind file processing app. The backend uses a category-based conversion router and validates both uploaded files and generated outputs before a job is marked successful.

## Local Setup

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py manage.py migrate
py manage.py check_file_engines
py manage.py runserver
```

Open `http://127.0.0.1:8000/`.

## System Software

Python packages do not provide every conversion engine. Install these separately where needed:

- FFmpeg and FFprobe: video/audio conversion and extraction
- LibreOffice: DOC, DOCX, ODT, RTF, PPT, PPTX, XLS and XLSX conversions
- Tesseract OCR: scanned PDF fallback OCR
- Redis: Celery broker when background workers are enabled

Windows can use absolute binary paths through environment variables:

```powershell
$env:FFMPEG_BINARY="C:\Tools\ffmpeg\bin\ffmpeg.exe"
$env:FFPROBE_BINARY="C:\Tools\ffmpeg\bin\ffprobe.exe"
$env:LIBREOFFICE_BINARY="C:\Program Files\LibreOffice\program\soffice.exe"
$env:TESSERACT_BINARY="C:\Program Files\Tesseract-OCR\tesseract.exe"
```

Linux/Docker images should install at least:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libreoffice tesseract-ocr fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*
```

## Environment Variables

- `MAX_UPLOAD_SIZE`
- `MAX_IMAGE_PIXELS`
- `MAX_VIDEO_DURATION`
- `MAX_ARCHIVE_SIZE`
- `MAX_EXTRACTED_SIZE`
- `MAX_ARCHIVE_FILES`
- `CONVERSION_TIMEOUT`
- `CONVERSION_TMP_ROOT`
- `FFMPEG_BINARY`
- `FFPROBE_BINARY`
- `LIBREOFFICE_BINARY`
- `TESSERACT_BINARY`

## Supported Matrix

- Images: JPG, JPEG, PNG, WEBP, BMP, GIF, TIFF to JPG, PNG, WEBP, BMP, TIFF, PDF where compatible
- PDF: TXT, DOCX, JPG, PNG; scanned text requires OCR support
- Office: DOC, DOCX, ODT, RTF, PPT, PPTX, XLS, XLSX through LibreOffice
- Text: TXT to PDF/DOCX, HTML to PDF/TXT, Markdown to PDF/HTML/TXT, CSV to XLSX
- Video: MP4, MOV, AVI, MKV, WEBM through FFmpeg
- Audio: MP3, WAV, M4A, AAC, FLAC, OGG through FFmpeg
- ZIP: create ZIP, validate/recompress ZIP, extract ZIP with Zip Slip protection

Unsupported combinations are rejected before processing. The app must not rename extensions and call that a conversion.

## Diagnostics

Run:

```powershell
py manage.py check_file_engines
```

The command reports Pillow, PyMuPDF, python-docx, openpyxl, python-pptx, FFmpeg, FFprobe, LibreOffice, Tesseract, pillow-heif, Celery and Redis availability.

## Tests

```powershell
py manage.py test
```

The included tests cover core image conversion, transparent PNG to JPEG handling, invalid conversion rejection, ZIP creation with duplicate names, and ZIP traversal rejection. Full media and Office matrix tests require FFmpeg and LibreOffice installed on the test machine.

## Background Processing

The service layer is structured so large jobs can be moved behind Celery. Celery/Redis are listed as dependencies and detected by diagnostics, but no worker is started automatically by this project.

## Production Notes

Set `SECRET_KEY`, `DEBUG=false`, and `ALLOWED_HOSTS`. Use private storage for uploads/results, schedule cleanup of abandoned `ProcessingJob` files, and run `py manage.py collectstatic` during deployment.
