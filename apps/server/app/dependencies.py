from __future__ import annotations

from fastapi import Request

from .services.curriculum import CurriculumService
from .services.lessons import LessonService
from .services.subjects import SubjectService
from .services.users import UserService
from .services.tutor import TutorService
from .services.strands import StrandsRuntime
from .settings import Settings


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_user_service(request: Request) -> UserService:
    return request.app.state.user_service


def get_curriculum_service(request: Request) -> CurriculumService:
    return request.app.state.curriculum_service


def get_lesson_service(request: Request) -> LessonService:
    return request.app.state.lesson_service


def get_strands_runtime(request: Request) -> StrandsRuntime:
    return request.app.state.strands_runtime


def get_subject_service(request: Request) -> SubjectService:
    return request.app.state.subject_service


def get_tutor_service(request: Request) -> TutorService:
    return request.app.state.tutor_service
