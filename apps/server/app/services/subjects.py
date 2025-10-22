from __future__ import annotations

import asyncio
import re
from typing import AsyncGenerator, List

from pydantic import BaseModel, Field

from ..schemas import SubjectCandidate, SubjectGenerationRequest, SubjectStreamEvent
from .strands import StrandsRuntime


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "subject"


class SubjectAgentItem(BaseModel):
    name: str = Field(..., description="Short subject title suitable for a navigation menu.")
    recommended: bool = Field(default=False, description="True if this subject is a top recommendation.")


class SubjectAgentResponse(BaseModel):
    subjects: List[SubjectAgentItem] = Field(min_items=6, max_items=15)


class SubjectService:
    def __init__(self, runtime: StrandsRuntime) -> None:
        self._runtime = runtime

    async def generate_subjects(self, payload: SubjectGenerationRequest) -> List[SubjectCandidate]:
        audience = (
            "students attending school with structured classes"
            if payload.education_status == "in_school"
            else "independent learners outside formal school"
        )

        qualifiers: list[str] = []
        if payload.grade_level:
            qualifiers.append(f"grade level '{payload.grade_level}'")
        if payload.school_grade:
            qualifiers.append(f"class '{payload.school_grade}'")
        if payload.age_range:
            qualifiers.append(f"age range '{payload.age_range}'")

        qualifier_text = ", ".join(qualifiers) if qualifiers else "mixed ability"

        system_prompt = (
            "You are an official ministry of education curriculum creator. "
            "You know the approved and appropriate subject for each grade level and design uplifting, culturally relevant learning paths. "
            "Respond with concise subject names that can be shown in a UI list."
        )

        prompt = f"""
Generate a list of approved subjects for {audience} in {payload.country} who will learn in {payload.language}.

Context:
- Ability profile: {qualifier_text}
- Prior learner interests: {", ".join(payload.interests or []) or "unknown"}

Guidelines:
- Generate between 6 and 15 subjects
- Make names short (max 4 words) and concrete
- Mark exactly 2-3 subjects as recommended
- In most schools, mathematics is compulsory so it should be recommended
"""

        response = await self._runtime.structured_output(
            SubjectAgentResponse,
            prompt.strip(),
            system_prompt=system_prompt,
            temperature=0.4,
        )

        items: list[SubjectCandidate] = []
        seen: set[str] = set()

        for item in response.subjects:
            label = item.name.strip()
            if not label:
                continue
            slug = _slugify(label)
            if slug in seen:
                continue
            seen.add(slug)
            items.append(
                SubjectCandidate(
                    id=slug,
                    label=label,
                    recommended=item.recommended,
                ),
            )

        return items[:15]

    async def stream_subjects(
        self,
        payload: SubjectGenerationRequest,
    ) -> AsyncGenerator[SubjectStreamEvent, None]:
        yield SubjectStreamEvent(type="status", message="Checking in with Graspy's learning guide…")

        try:
            subjects = await self.generate_subjects(payload)
        except Exception as exc:  # noqa: BLE001
            yield SubjectStreamEvent(
                type="error",
                message=str(exc),
            )
            return

        if not subjects:
            yield SubjectStreamEvent(
                type="error",
                message="The learning guide did not return any subjects.",
            )
            return

        # Stream recommended subjects first for a playful reveal
        recommended = [subject for subject in subjects if subject.recommended]
        others = [subject for subject in subjects if not subject.recommended]

        if recommended:
            yield SubjectStreamEvent(
                type="subjects",
                message="Here are the recommended starting points.",
                subjects=recommended,
            )
            await asyncio.sleep(0.25)

        yield SubjectStreamEvent(
            type="subjects",
            message="More subjects you can explore.",
            subjects=others,
        )

        yield SubjectStreamEvent(type="complete", message="Subject generation complete.")
