from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from ..schemas import TutorChatRequest, TutorChatResponse
from .strands import StrandsRuntime


class TutorAgentPayload(BaseModel):
    answer: str = Field(..., description="Primary response for the learner.")
    follow_ups: List[str] | None = Field(
        default=None,
        description="Optional short suggestions to continue the conversation.",
    )
    navigation_tip: str | None = Field(
        default=None,
        description="Optional guidance for which topic to explore next.",
    )


class TutorService:
    def __init__(self, runtime: StrandsRuntime) -> None:
        self._runtime = runtime

    async def chat(self, payload: TutorChatRequest) -> TutorChatResponse:
        history_lines = []
        for entry in (payload.history or [])[-8:]:
            speaker = "Graspy" if entry.role == "assistant" else "Learner"
            history_lines.append(f"{speaker}: {entry.content.strip()}")
        history_text = "\n".join(history_lines) or "None"

        related_topics = ", ".join(payload.related_topics or []) or "None"
        grade_level = payload.grade_level or "middle school"
        country = payload.country or "unspecified"

        system_prompt = (
            "You are Graspy, a warm and encouraging AI tutor. "
            "You always respond in the learner's language and keep answers concise, practical, and supportive. "
            "If you reference other topics, make the connection explicit."
        )

        instruction = f"""
Learner profile:
- Country: {country}
- Language: {payload.language}
- Grade Level: {grade_level}
- Subject: {payload.subject}
- Current topic: {payload.topic or "Not specified"}
- Related topics to consider: {related_topics}

Recent conversation:
{history_text}

Current learner message:
\"\"\"{payload.message}\"\"\"

Guidelines:
- Provide a clear, encouraging explanation or answer in {payload.language}.
- Mention the current topic or subject when possible.
- Offer up to three concise follow-up suggestions that keep the learner engaged.
- Include a navigation_tip only if it genuinely helps the learner move to another relevant topic.
"""

        result = await self._runtime.structured_output(
            TutorAgentPayload,
            instruction.strip(),
            system_prompt=system_prompt,
            temperature=0.5,
        )

        followups = result.follow_ups or None
        if followups:
            followups = [item.strip() for item in followups if item.strip()]
            if not followups:
                followups = None

        navigation_tip = result.navigation_tip.strip() if result.navigation_tip else None

        return TutorChatResponse(
            answer=result.answer.strip(),
            follow_ups=followups,
            navigation_tip=navigation_tip,
        )
