"""
ASGI entrypoint: HTTP + Django Channels (WebSockets).
"""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "colour_parrot.settings")
django_asgi_app = get_asgi_application()

from tms.jwt_ws import JWTQueryTokenMiddleware  # noqa: E402
from tms.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                JWTQueryTokenMiddleware(URLRouter(websocket_urlpatterns))
            )
        ),
    }
)
