from __future__ import annotations

from typing import AsyncIterator, Dict, List, cast

from fastapi import HTTPException, status

from ..schemas import (
    LessonMetadata,
    LessonPayload,
    LessonPractice,
    LessonProgress,
    LessonRequest,
    LessonResponse,
    LessonSession,
    LessonSlide,
    LessonStreamEvent,
)
from ..workflows.lesson import (
    attach_practice_to_slides,
    generate_lesson_assets,
    generate_lesson_practice,
    generate_lesson_slides,
)
from .strands import StrandsRuntime


class LessonService:
    def __init__(self, runtime: StrandsRuntime) -> None:
        self._runtime = runtime

    async def generate_lesson(self, request: LessonRequest) -> LessonResponse:
        self._validate_request(request)

        try:
            lesson_assets, practice = await generate_lesson_assets(
                self._runtime,
                request,
                slide_max_tokens=self._runtime.settings.lesson_slide_max_tokens,
                practice_max_tokens=self._runtime.settings.lesson_practice_max_tokens,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        return self._build_lesson_response(request, lesson_assets, practice)

    async def stream_lesson(self, request: LessonRequest) -> AsyncIterator[LessonStreamEvent]:
        self._validate_request(request)

        yield LessonStreamEvent(
            type="status",
            phase="initializing",
            message="Preparing lesson request",
        )

        try:
            yield LessonStreamEvent(
                type="status",
                phase="generating_slides",
                message="Designing lesson structure",
            )
            slides_payload = await generate_lesson_slides(self._runtime, request)
            yield LessonStreamEvent(
                type="status",
                phase="slides_ready",
                message="Slides drafted successfully",
            )
        except Exception as exc:  # noqa: BLE001
            yield LessonStreamEvent(
                type="error",
                phase="error",
                message=str(exc) or "Failed to generate lesson slides",
            )
            return

        try:
            yield LessonStreamEvent(
                type="status",
                phase="generating_practice",
                message="Crafting practice question",
            )
            practice_payload = await generate_lesson_practice(self._runtime, request, slides_payload)
        except Exception as exc:  # noqa: BLE001
            yield LessonStreamEvent(
                type="error",
                phase="error",
                message=str(exc) or "Failed to generate practice question",
            )
            return

        slides_with_practice = attach_practice_to_slides(slides_payload, practice_payload)
        lesson_assets = {
            "overview": slides_with_practice.overview,
            "learning_objectives": slides_with_practice.learning_objectives,
            "slides": slides_with_practice.slides,
        }
        practice = {
            "question": practice_payload.question,
            "options": practice_payload.options,
            "answer_index": practice_payload.correct_option_index,
            "correct_feedback": practice_payload.correct_feedback,
            "incorrect_feedback": practice_payload.incorrect_feedback,
        }

        response = self._build_lesson_response(request, lesson_assets, practice)

        yield LessonStreamEvent(
            type="complete",
            phase="complete",
            message="Lesson ready",
            data=response,
        )

    def _build_lesson_response(
        self,
        request: LessonRequest,
        lesson_assets: Dict[str, object],
        practice: Dict[str, object],
    ) -> LessonResponse:
        session = self._build_session(request, lesson_assets, practice)
        lesson = self._build_lesson_payload(session, lesson_assets)

        return LessonResponse(
            success=True,
            session=session,
            lesson=lesson,
        )

    def _validate_request(self, request: LessonRequest) -> None:
        if not request.country or not request.language or not request.subject or not request.topic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="country, language, subject, and topic are required",
            )

    def _build_session(
        self,
        request: LessonRequest,
        lesson_assets: Dict[str, object],
        practice: Dict[str, object],
    ) -> LessonSession:
        total_topics = max(1, request.total_topics)
        overview = cast(str, lesson_assets.get("overview", "")).strip()
        learning_objectives = cast(List[str], lesson_assets.get("learning_objectives", []))
        slides = cast(List[LessonSlide], lesson_assets.get("slides", []))

        if not overview or not slides:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Lesson generation returned incomplete slide content",
            )

        session = LessonSession(
            id=f"lesson-{request.subject.lower().replace(' ', '-')}-{request.topic_index}",
            subject=request.subject,
            topic=request.topic,
            topic_index=request.topic_index,
            total_topics=total_topics,
            explanation=overview,
            practice=LessonPractice(
                question=practice["question"],
                options=practice["options"],
                answer_index=practice["answer_index"],
                correct_feedback=practice["correct_feedback"],
                incorrect_feedback=practice["incorrect_feedback"],
            ),
            slides=slides,
            phase="explanation",
            metadata=LessonMetadata(
                country=request.country,
                language=request.language,
                grade_level=request.grade_level,
                generator="strands_lesson_v1",
                learning_objectives=learning_objectives,
            ),
        )

        return session

    def _build_lesson_payload(
        self,
        session: LessonSession,
        lesson_assets: Dict[str, object],
    ) -> LessonPayload:
        learning_objectives = cast(List[str], lesson_assets.get("learning_objectives", []))
        slides = cast(List[LessonSlide], lesson_assets.get("slides", []))

        examples = []
        for idx, option in enumerate(session.practice.options, start=0):
            label = chr(ord("A") + idx)
            examples.append(f"{label}. {option}")

        lesson = LessonPayload(
            title=session.topic,
            content=session.explanation,
            keyPoints=learning_objectives,
            slides=slides,
            examples=examples,
            practice=LessonPractice(
                question=session.practice.question,
                options=session.practice.options,
                answer_index=session.practice.answer_index,
                correct_feedback=session.practice.correct_feedback,
                incorrect_feedback=session.practice.incorrect_feedback,
            ),
            progress=LessonProgress(
                current=session.topic_index + 1,
                total=session.total_topics,
            ),
        )

        return lesson
