import logging
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "thuna.settings")
application = get_wsgi_application()

# Ensure database tables exist automatically on server boot (e.g. fresh Render deployments)
try:
    from django.core.management import call_command
    call_command("migrate", interactive=False)
except Exception as e:
    logging.getLogger(__name__).warning("Automatic database migration check failed or skipped: %s", e)
