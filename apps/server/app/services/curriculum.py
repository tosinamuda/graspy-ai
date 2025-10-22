from __future__ import annotations

import logging
from typing import AsyncGenerator, Dict, List

from fastapi import HTTPException, status

from ..schemas import (
    CurriculumRequest,
    CurriculumResponse,
    CurriculumStreamEvent,
    CurriculumSubject,
)
from ..workflows.curriculum import (
    generate_curriculum_plan,
    generate_subject_list,
    generate_topic_map,
)
from .strands import StrandsRuntime

logger = logging.getLogger(__name__)


class CurriculumService:
    def __init__(self, runtime: StrandsRuntime) -> None:
        self._runtime = runtime

    async def generate_curriculum(self, request: CurriculumRequest) -> CurriculumResponse:
        if not request.country or not request.language:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="country and language are required",
            )

        logger.debug("Generating curriculum", extra={"country": request.country, "language": request.language})

        try:
            subjects, topics = await generate_curriculum_plan(self._runtime, request)
        except ValueError as exc:
            logger.exception("Curriculum generation failed during structured output")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        return CurriculumResponse(
            subjects=subjects,
            topics=topics,
            currentStep="topics_generated",
            error=None,
        )

    async def stream_curriculum(
        self,
        request: CurriculumRequest,
    ) -> AsyncGenerator[CurriculumStreamEvent, None]:
        if not request.country or not request.language:
            yield CurriculumStreamEvent(
                subjects=[],
                topics={},
                currentStep="error",
                error="country and language are required",
            )
            return

        subjects: List[CurriculumSubject] = []
        topics: Dict[str, List[str]] = {}

        yield CurriculumStreamEvent(
            subjects=subjects,
            topics=topics,
            currentStep="initializing",
            error=None,
        )

        try:
            logger.debug("Streaming: generating subjects", extra={"country": request.country, "language": request.language})
            subjects = await generate_subject_list(self._runtime, request)
            yield CurriculumStreamEvent(
                subjects=subjects,
                topics=topics,
                currentStep="subjects_generated",
                error=None,
            )

            logger.debug("Streaming: generating topics", extra={"subjects": [subject.slug for subject in subjects]})
            topics = await generate_topic_map(self._runtime, request, subjects)
            yield CurriculumStreamEvent(
                subjects=subjects,
                topics=topics,
                currentStep="topics_generated",
                error=None,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Curriculum streaming failed")
            yield CurriculumStreamEvent(
                subjects=subjects,
                topics=topics,
                currentStep="error",
                error=str(exc),
            )
