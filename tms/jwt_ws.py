"""Authenticate WebSocket connections using JWT passed as ?token=<access>."""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import User


@database_sync_to_async
def _user_from_id(uid: int):
    try:
        return User.objects.get(pk=uid)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTQueryTokenMiddleware:
    """Populate scope['user'] from JWT query param when session user is anonymous."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            u = scope.get("user")
            if u is None or not getattr(u, "is_authenticated", False):
                qs = parse_qs(scope.get("query_string", b"").decode())
                raw = (qs.get("token") or [None])[0]
                if raw:
                    try:
                        token = AccessToken(raw)
                        uid = int(token["user_id"])
                        scope["user"] = await _user_from_id(uid)
                    except (InvalidToken, TokenError, KeyError, ValueError, TypeError):
                        scope["user"] = AnonymousUser()
        return await self.app(scope, receive, send)
