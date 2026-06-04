"""
API-only backend deployment.

The React frontend is hosted separately (Hostinger).
This catch-all returns a helpful JSON response for any non-API,
non-admin URL that hits the backend directly.
"""
from django.http import JsonResponse


def spa_catchall(request, path: str = ""):
    """
    The frontend lives on Hostinger (c1r9rt-workflow.in).
    If someone hits the backend URL directly, return a friendly JSON message
    instead of crashing with a 404.
    """
    return JsonResponse(
        {
            "service": "Colour Parrot API",
            "status": "running",
            "frontend": "https://c1r9rt-workflow.in",
            "admin": "/cp-vault-99/",
        },
        status=200,
    )
