from __future__ import annotations

import asyncio
import contextlib
import json

from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sse_starlette.sse import EventSourceResponse

from ..dependencies import (
    get_curriculum_service,
    get_lesson_service,
    get_settings,
    get_subject_service,
    get_tutor_service,
    get_user_service,
)
from ..schemas import (
    CurriculumRequest,
    CurriculumResponse,
    CurriculumStreamEvent,
    ErrorResponse,
    HealthResponse,
    LessonRequest,
    LessonResponse,
    SubjectGenerationRequest,
    SubjectStreamEvent,
    TutorChatRequest,
    TutorChatResponse,
    UsersResponse,
    UserCreate,
    UserUpdate,
)
from ..services.curriculum import CurriculumService
from ..services.lessons import LessonService
from ..services.subjects import SubjectService
from ..services.tutor import TutorService
from ..services.users import UserService
from ..settings import Settings

api_router = APIRouter()

CACHE_CONTROL_HEADER = "public, max-age=3600"


@api_router.get("/health", response_model=HealthResponse, tags=["meta"])
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        details={
            "environment": settings.environment,
            "strandsAvailable": not settings.strands_force_fallback,
        },
    )


@api_router.get("/users/all", response_model=UsersResponse, tags=["users"])
async def list_users(user_service: UserService = Depends(get_user_service)) -> UsersResponse:
    users = await user_service.list_users()
    return UsersResponse(users=users)


@api_router.post("/users/add", status_code=201, tags=["users"])
async def add_user(
    payload: UserCreate,
    user_service: UserService = Depends(get_user_service),
) -> Response:
    await user_service.add_user(payload)
    return Response(status_code=201)


@api_router.put("/users/update", status_code=200, tags=["users"])
async def update_user(
    payload: UserUpdate,
    user_service: UserService = Depends(get_user_service),
) -> Response:
    await user_service.update_user(payload)
    return Response(status_code=200)


@api_router.delete("/users/delete/{user_id}", status_code=200, tags=["users"])
async def delete_user(
    user_id: int,
    user_service: UserService = Depends(get_user_service),
) -> Response:
    await user_service.delete_user(user_id)
    return Response(status_code=200)


@api_router.post(
    "/curriculum/tutor-chat",
    response_model=TutorChatResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["curriculum"],
)
async def tutor_chat(
    payload: TutorChatRequest,
    tutor_service: TutorService = Depends(get_tutor_service),
) -> TutorChatResponse:
    if not payload.message.strip() or not payload.subject.strip() or not payload.language.strip():
        raise HTTPException(status_code=400, detail="message, subject, and language are required")

    return await tutor_service.chat(payload)


@api_router.post(
    "/curriculum/generate",
    response_model=CurriculumResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
    tags=["curriculum"],
)
async def generate_curriculum(
    payload: CurriculumRequest,
    curriculum_service: CurriculumService = Depends(get_curriculum_service),
) -> CurriculumResponse:
    response = await curriculum_service.generate_curriculum(payload)
    return response


@api_router.get(
    "/curriculum/generate-stream",
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
    tags=["curriculum"],
)
async def generate_curriculum_stream(
    country: str = Query(...),
    language: str = Query(...),
    grade_level: str | None = Query(None, alias="gradeLevel"),
    subjects: list[str] | None = Query(None, alias="subject"),
    curriculum_service: CurriculumService = Depends(get_curriculum_service),
) -> EventSourceResponse:
    request_payload = CurriculumRequest(
        country=country,
        language=language,
        gradeLevel=grade_level,
        subjects=subjects,
    )

    async def event_publisher():
        queue: asyncio.Queue[dict | None] = asyncio.Queue()

        async def pump_stream():
            try:
                async for event in curriculum_service.stream_curriculum(request_payload):
                    await queue.put(
                        {
                            "event": "message",
                            "data": json.dumps(event.model_dump(by_alias=True, exclude_none=True)),
                        },
                    )
            finally:
                await queue.put(None)

        async def heartbeat():
            try:
                while True:
                    await asyncio.sleep(20)
                    await queue.put({"event": "ping", "data": "keepalive"})
            except asyncio.CancelledError:
                pass

        producer = asyncio.create_task(pump_stream())
        ping_task = asyncio.create_task(heartbeat())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    yield {"data": "[DONE]"}
                    break
                yield item
        finally:
            producer.cancel()
            ping_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await producer
            with contextlib.suppress(asyncio.CancelledError):
                await ping_task

    return EventSourceResponse(
        event_publisher(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@api_router.post(
    "/curriculum/lesson",
    response_model=LessonResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
    tags=["lessons"],
)
async def generate_lesson(
    payload: LessonRequest,
    response: Response,
    lesson_service: LessonService = Depends(get_lesson_service),
) -> LessonResponse:
    result = await lesson_service.generate_lesson(payload)
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER
    response.headers["X-Cache"] = "MISS"
    return result


@api_router.get(
    "/curriculum/lesson",
    response_model=LessonResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    tags=["lessons"],
)
async def get_lesson(
    response: Response,
    lesson_service: LessonService = Depends(get_lesson_service),
    country: str = Query(...),
    language: str = Query(...),
    subject: str = Query(...),
    topic: str = Query(...),
    grade_level: str | None = Query(None, alias="gradeLevel"),
    grade: str | None = Query(None, alias="grade"),
    index: int = Query(0),
    total_topics: int = Query(1, alias="totalTopics"),
) -> LessonResponse:
    final_grade_level = grade_level or grade

    lesson_request = LessonRequest(
        country=country,
        language=language,
        subject=subject,
        topic=topic,
        gradeLevel=final_grade_level,
        topicIndex=index,
        totalTopics=total_topics,
    )

    result = await lesson_service.generate_lesson(lesson_request)
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER
    response.headers["X-Cache"] = "MISS"
    return result


@api_router.get(
    "/curriculum/lesson/stream",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
    tags=["lessons"],
)
async def stream_lesson(
    lesson_service: LessonService = Depends(get_lesson_service),
    country: str = Query(...),
    language: str = Query(...),
    subject: str = Query(...),
    topic: str = Query(...),
    grade_level: str | None = Query(None, alias="gradeLevel"),
    grade: str | None = Query(None, alias="grade"),
    index: int = Query(0),
    total_topics: int = Query(1, alias="totalTopics"),
) -> EventSourceResponse:
    final_grade_level = grade_level or grade

    request_payload = LessonRequest(
        country=country,
        language=language,
        subject=subject,
        topic=topic,
        gradeLevel=final_grade_level,
        topicIndex=index,
        totalTopics=total_topics,
    )

    async def event_publisher():
        queue: asyncio.Queue[dict | None] = asyncio.Queue()

        async def pump_stream():
            try:
                async for event in lesson_service.stream_lesson(request_payload):
                    await queue.put(
                        {
                            "event": "message",
                            "data": event.model_dump_json(by_alias=True, exclude_none=True),
                        },
                    )
            except HTTPException as exc:
                await queue.put(
                    {
                        "event": "message",
                        "data": json.dumps(
                            {
                                "type": "error",
                                "phase": "error",
                                "message": exc.detail if isinstance(exc.detail, str) else "Lesson stream failed",
                            },
                        ),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                await queue.put(
                    {
                        "event": "message",
                        "data": json.dumps(
                            {
                                "type": "error",
                                "phase": "error",
                                "message": str(exc) or "Lesson stream failed",
                            },
                        ),
                    },
                )
            finally:
                await queue.put(None)

        async def heartbeat():
            try:
                while True:
                    await asyncio.sleep(20)
                    await queue.put({"event": "ping", "data": "keepalive"})
            except asyncio.CancelledError:
                pass

        producer = asyncio.create_task(pump_stream())
        ping_task = asyncio.create_task(heartbeat())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    yield {"data": "[DONE]"}
                    break
                yield item
        finally:
            producer.cancel()
            ping_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await producer
            with contextlib.suppress(asyncio.CancelledError):
                await ping_task

    return EventSourceResponse(
        event_publisher(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@api_router.get(
    "/subjects/generate-stream",
    tags=["subjects"],
)
async def generate_subjects_stream(
    country: str = Query(...),
    language: str = Query(...),
    education_status: str = Query(..., alias="educationStatus"),
    grade_level: str | None = Query(None, alias="gradeLevel"),
    school_grade: str | None = Query(None, alias="schoolGrade"),
    age_range: str | None = Query(None, alias="ageRange"),
    interests: list[str] | None = Query(None, alias="interest"),
    subject_service: SubjectService = Depends(get_subject_service),
) -> EventSourceResponse:
    request_payload = SubjectGenerationRequest(
        country=country,
        language=language,
        educationStatus=education_status,
        gradeLevel=grade_level,
        schoolGrade=school_grade,
        ageRange=age_range,
        interests=interests,
    )

    async def event_publisher():
        async for event in subject_service.stream_subjects(request_payload):
            yield {
                "event": "message",
                "data": event.model_dump_json(by_alias=True),
            }
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(
        event_publisher(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
