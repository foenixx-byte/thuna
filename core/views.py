import logging
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django import forms
from .forms import UploadForm, validate_upload
from .models import ProcessingJob
from .services import ConversionRouter, get_capabilities, process_convert, process_merge, save_failure

logger = logging.getLogger(__name__)


def session_key(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def owned_job(request, token):
    return get_object_or_404(ProcessingJob, token=token, session_key=session_key(request))


def home(request):
    jobs = ProcessingJob.objects.filter(session_key=session_key(request), status__in=["success", "completed"])[:4]
    saved = sum(max(0, job.original_size - job.result_size) for job in jobs)
    return render(request, "core/home.html", {"jobs": jobs, "saved": saved})


from django.urls import reverse


def compressor(request, mode="compress"):
    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", "")

    if request.method == "POST":
        form = UploadForm(request.POST, request.FILES)
        if form.is_valid():
            uploads = request.FILES.getlist("file")
            uploaded = uploads[0]
            operation = form.cleaned_data["operation"]
            if operation == "merge":
                if len(uploads) < 2:
                    form.add_error("file", "Choose at least two files to merge.")
                else:
                    for item in uploads:
                        try:
                            validate_upload(item)
                        except forms.ValidationError as exc:
                            form.add_error("file", f"{item.name}: {exc.messages[0]}")
                            break
            elif operation == "zip_create":
                for item in uploads:
                    max_bytes = getattr(settings, "MAX_UPLOAD_SIZE", 500 * 1024 * 1024)
                    if item.size > max_bytes:
                        form.add_error("file", f"{item.name}: Files must be {max_bytes // (1024 * 1024)} MB or smaller.")
                        break
            if form.errors:
                if is_ajax:
                    first_err = "Validation error"
                    for _field, errs in form.errors.items():
                        if errs:
                            first_err = errs[0]
                            break
                    return JsonResponse({"success": False, "error_code": "VALIDATION_ERROR", "error_message": str(first_err)}, status=400)
                return render(request, "core/compressor.html", {"form": form, "mode": mode, "capabilities": get_capabilities()})

            original_name = uploaded.name
            original_size = uploaded.size
            if operation == "merge":
                original_name = f"Merged {len(uploads)} files"
                original_size = sum(item.size for item in uploads)
            elif operation == "zip_create":
                original_name = f"{len(uploads)} selected files"
                original_size = sum(item.size for item in uploads)
            job = ProcessingJob.objects.create(
                session_key=session_key(request),
                operation=operation,
                original=uploaded,
                original_name=original_name,
                original_size=original_size,
            )
            try:
                output_format = form.cleaned_data.get("output_format")
                quality = form.cleaned_data.get("quality") or 80
                if operation == "merge":
                    process_merge(job, uploads, output_format, quality)
                elif operation == "zip_create":
                    ConversionRouter().convert(job, "zip", quality, files=uploads)
                elif operation == "zip_extract":
                    ConversionRouter().convert(job, "extract", quality)
                elif operation == "convert":
                    process_convert(job, output_format, quality)
                else:
                    ConversionRouter().convert(job, output_format, quality)

                if is_ajax:
                    return JsonResponse({
                        "success": True,
                        "token": str(job.token),
                        "redirect_url": reverse("result", kwargs={"token": job.token}),
                    })
                return redirect("result", token=job.token)
            except Exception as exc:
                logger.exception("Job processing failed")
                save_failure(job, exc)
                if is_ajax:
                    return JsonResponse({
                        "success": False,
                        "token": str(job.token),
                        "error_code": job.error_code or "CONVERSION_FAILED",
                        "error_message": job.error_message or str(exc),
                        "redirect_url": reverse("result", kwargs={"token": job.token}),
                    }, status=400)
                return redirect("result", token=job.token)
        else:
            if is_ajax:
                first_err = "Please check your file and options."
                for _field, errs in form.errors.items():
                    if errs:
                        first_err = errs[0]
                        break
                return JsonResponse({"success": False, "error_code": "VALIDATION_ERROR", "error_message": str(first_err)}, status=400)
    else:
        form = UploadForm(initial={"operation": mode, "output_format": "", "quality": 80})
    return render(request, "core/compressor.html", {"form": form, "mode": mode, "capabilities": get_capabilities()})


def result(request, token):
    return render(request, "core/result.html", {"job": owned_job(request, token)})


def download(request, token):
    job = owned_job(request, token)
    if job.status not in {ProcessingJob.Status.SUCCESS, ProcessingJob.Status.COMPLETED} or not job.result:
        raise Http404
    return FileResponse(job.result.open("rb"), as_attachment=True, filename=job.result_name)


def files(request):
    return render(request, "core/files.html", {"jobs": ProcessingJob.objects.filter(session_key=session_key(request))})


def pdf_tools(request):
    jobs = ProcessingJob.objects.filter(session_key=session_key(request), status__in=["success", "completed"], result_name__iendswith=".pdf")[:4]
    return render(request, "core/pdf_tools.html", {"jobs": jobs})


def capabilities(request):
    return JsonResponse({"success": True, "capabilities": get_capabilities()})


def about(request):
    return render(request, "core/about.html")


def privacy(request):
    return render(request, "core/privacy.html")


def terms(request):
    return render(request, "core/terms.html")


def robots_txt(request):
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "Allow: /compress/\n"
        "Allow: /convert/\n"
        "Allow: /merge/\n"
        "Allow: /pdf-tools/\n"
        "Allow: /about/\n"
        "Allow: /privacy/\n"
        "Allow: /terms/\n"
        "Disallow: /jobs/\n"
        "Disallow: /media/\n"
        "Disallow: /api/\n"
        "Disallow: /admin/\n"
    )
    return HttpResponse(content, content_type="text/plain")


def custom_404(request, exception=None):
    return render(request, "404.html", status=404)

