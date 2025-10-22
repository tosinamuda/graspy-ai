from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router
from .settings import Settings, get_settings
from .services.curriculum import CurriculumService
from .services.lessons import LessonService
from .services.subjects import SubjectService
from .services.users import UserService
from .services.tutor import TutorService
from .services.strands import StrandsRuntime

import logging

# Configure the root strands logger
logging.getLogger("strands").setLevel(logging.DEBUG)

# Add a handler to see the logs
logging.basicConfig(
    format="%(levelname)s | %(name)s | %(message)s", 
    handlers=[logging.StreamHandler()]
)

def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(
        title="Graspy API",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    allow_origins = settings.cors_origins or ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    strands_runtime = StrandsRuntime(settings=settings)
    app.state.settings = settings
    app.state.strands_runtime = strands_runtime
    app.state.user_service = UserService(settings=settings)
    app.state.curriculum_service = CurriculumService(runtime=strands_runtime)
    app.state.lesson_service = LessonService(runtime=strands_runtime)
    app.state.subject_service = SubjectService(runtime=strands_runtime)
    app.state.tutor_service = TutorService(runtime=strands_runtime)

    app.include_router(api_router, prefix="/api")

    return app
