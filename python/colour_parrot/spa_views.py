"""
Serve the Vite production build (index.html + assets) from frontend/dist.
Used when the React app is deployed behind the same Django host (Antigravity / single server).
"""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def _dist_root() -> Path:
    return Path(settings.BASE_DIR).parent / "frontend" / "dist"


def spa_catchall(request, path: str = ""):
    """
    If `path` matches a file under dist/, serve it; otherwise serve index.html (client router).
    """
    root = _dist_root()
    if not root.is_dir():
        raise Http404("Frontend build not found. Run: cd frontend && npm run build")

    if path:
        candidate = (root / path).resolve()
        try:
            candidate.relative_to(root.resolve())
        except ValueError as exc:
            raise Http404() from exc
        if candidate.is_file():
            ctype, _ = mimetypes.guess_type(str(candidate))
            return FileResponse(
                candidate.open("rb"),
                content_type=ctype or "application/octet-stream",
            )

    index = root / "index.html"
    if not index.is_file():
        raise Http404("index.html missing in frontend/dist")
    return FileResponse(index.open("rb"), content_type="text/html")
