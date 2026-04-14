"""URL routing: API, JWT auth, media, and SPA (React) from frontend/dist."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from colour_parrot.spa_views import spa_catchall

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("tms.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# React SPA: after API routes; does not capture /api, /admin, /static, /media
urlpatterns += [
    re_path(r"^(?!api|admin|static|media)(?P<path>.*)$", spa_catchall),
]
