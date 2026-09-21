from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"), path("compress/", views.compressor, name="compress"),
    path("convert/", views.compressor, {"mode": "convert"}, name="convert"),
    path("merge/", views.compressor, {"mode": "merge"}, name="merge"),
    path("zip/create/", views.compressor, {"mode": "zip_create"}, name="zip_create"),
    path("zip/extract/", views.compressor, {"mode": "zip_extract"}, name="zip_extract"),
    path("api/capabilities/", views.capabilities, name="capabilities"),
    path("pdf-tools/", views.pdf_tools, name="pdf_tools"), path("files/", views.files, name="files"),
    path("about/", views.about, name="about"),
    path("privacy/", views.privacy, name="privacy"),
    path("terms/", views.terms, name="terms"),
    path("robots.txt", views.robots_txt, name="robots_txt"),
    path("404/", views.custom_404, name="preview_404"),
    path("jobs/<uuid:token>/", views.result, name="result"), path("jobs/<uuid:token>/download/", views.download, name="download"),
]
