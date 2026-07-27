"""
Django settings for Colour Parrot TMS.
Environment variables override defaults for production (PostgreSQL, Redis, secrets).
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "dev-only-change-me-in-production-use-long-random-string"
)
DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() in ("1", "true", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get(
        "DJANGO_ALLOWED_HOSTS", 
        "colour-parrot-mgtsystem.onrender.com,c1r9rt-workflow.in,www.c1r9rt-workflow.in,localhost,127.0.0.1"
    ).split(",")
    if h.strip()
]

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "channels",
    "accounts",
    "tms",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "colour_parrot.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "colour_parrot.wsgi.application"
ASGI_APPLICATION = "colour_parrot.asgi.application"

# --- Database (PostgreSQL in production) ---
if os.environ.get("DATABASE_URL"):
    import dj_database_url

    DATABASES = {"default": dj_database_url.config(conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "colour_parrot"),
            "USER": os.environ.get("POSTGRES_USER", "postgres"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "postgres"),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }

# Optional: SQLite for local quick start without Postgres
if os.environ.get("USE_SQLITE", "").lower() in ("1", "true", "yes"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# React production build copied here for Antigravity / single-server deploy
STATICFILES_DIRS = []
_frontend_dist = BASE_DIR.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    STATICFILES_DIRS.append(_frontend_dist)

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

# --- REST / JWT ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    # List endpoints return plain arrays for simpler React integration. Re-enable pagination for scale.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "5000/hour"
    }
}

X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_HTTPONLY = True

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- CORS & CSRF (always applied) ---
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "https://c1r9rt-workflow.in").split(",")
    if o.strip()
]

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CSRF_TRUSTED_ORIGINS",
        "https://c1r9rt-workflow.in,http://c1r9rt-workflow.in,https://www.c1r9rt-workflow.in,https://colour-parrot-mgtsystem.onrender.com,http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]

if not DEBUG:
    # Maximum Security Hardening for Production
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "false").lower() in ("1", "true", "yes")

# --- Channels (real-time) ---
REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

# Fallback to in-memory when Redis unavailable (dev only)
if os.environ.get("CHANNEL_LAYER_INMEMORY", "").lower() in ("1", "true", "yes"):
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }

# --- Celery ---
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE


# --- Automated Backup Settings ---
BACKUP_STORAGE_PATH = os.environ.get("BACKUP_STORAGE_PATH", os.path.join(MEDIA_ROOT, "backups"))
# Path on the local computer where the admin wants a copy
LOCAL_DOWNLOAD_PATH = os.environ.get("LOCAL_DOWNLOAD_PATH", "C:\\ColourParrotBackups")

# Suggestion 4: Data Retention (in months)
BACKUP_RETENTION_MONTHS = int(os.environ.get("BACKUP_RETENTION_MONTHS", "12"))

# Suggestion 1: External Cloud Sync Webhook (for Zapier/Make.com integration)
EXTERNAL_BACKUP_WEBHOOK = os.environ.get("EXTERNAL_BACKUP_WEBHOOK", "")

from celery.schedules import crontab

# --- Email Hub (SMTP) ---
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "465"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "false").lower() in ("1", "true", "yes")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "true").lower() in ("1", "true", "yes")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "workflowsecuritycolourparrot@gmail.com")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")

# Forced SMTP for Production Reliability
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

CELERY_BEAT_SCHEDULE = {
    "run-monthly-backup-at-1st": {
        "task": "tms.tasks.run_monthly_backup_task",
        "schedule": crontab(day_of_month="1", hour=0, minute=0),
    },
    "daily-deadline-check": {
        "task": "tms.tasks.check_deadlines",
        "schedule": crontab(hour=9, minute=0),
    },
    "daily-do-date-check": {
        "task": "tms.tasks.check_do_dates",
        "schedule": crontab(hour=9, minute=0),
    },
    "daily-birthday-check": {
        "task": "tms.tasks.check_birthdays",
        "schedule": crontab(hour=9, minute=0),
    },
}

