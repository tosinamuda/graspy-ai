from __future__ import annotations

from . import create_app
from .settings import get_settings

app = create_app()


def main() -> None:
    """Start the FastAPI application using uvicorn with settings from Settings class."""
    import uvicorn

    settings = get_settings()

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.uvicorn_reload,
    )


__all__ = ["app", "main"]
