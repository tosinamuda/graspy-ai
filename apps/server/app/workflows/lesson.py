from __future__ import annotations

import json
import logging
from typing import Dict, List, Optional

from strands import Agent, tool  # type: ignore[import-not-found]

from ..schemas import (
    LessonAgentResponse,
    LessonPracticePayload,
    LessonRequest,
    LessonSlide,
    LessonSlidesPayload,
)
from ..services.strands import StrandsRuntime

logger = logging.getLogger(__name__)


_CONTROL_CHAR_LATEX_ESCAPES = {
    ord("\t"): "\\t",
    ord("\b"): "\\b",
    ord("\f"): "\\f",
    ord("\r"): "\\r",
}


def _normalize_text(value: str) -> str:
    """
    Strip outer whitespace and ensure LaTeX is properly formatted.

    The LLM is instructed to use $ ... $ for inline math and $$ ... $$ for display math.
    This function just cleans up the text and handles any escape sequence issues.
    """
    if not value:
        return ""

    # First, strip whitespace
    normalized = value.strip()

    # Restore any control characters that should be LaTeX escapes
    normalized = normalized.translate(_CONTROL_CHAR_LATEX_ESCAPES)

    # The text should already have proper delimiters from the LLM
    # Just return it - the frontend will handle the rendering
    return normalized


# Removed _wrap_inline_latex - LLM now outputs properly formatted LaTeX with $ delimiters


def _sanitize_slide_payload(slides: LessonSlidesPayload) -> LessonSlidesPayload:
    overview = _normalize_text(slides.overview)
    objectives = [_normalize_text(item) for item in slides.learning_objectives if item.strip()][:3]

    sanitized_slides: List[LessonSlide] = []
    for raw_slide in slides.slides[:5]:
        slide_data = raw_slide.model_dump()
        slide_data["title"] = _normalize_text(raw_slide.title)

        # Log the before/after for debugging LaTeX issues
        original_body = raw_slide.body_md
        normalized_body = _normalize_text(original_body)
        if "\\" in original_body or "\\" in normalized_body:
            logger.debug(f"Slide body normalization:\nOriginal: {original_body[:200]}\nNormalized: {normalized_body[:200]}")
        slide_data["body_md"] = normalized_body

        assessment = raw_slide.assessment
        if not assessment:
            raise ValueError("Slide generation returned a slide without an assessment")

        assessment_data = assessment.model_dump()
        assessment_data["prompt"] = _normalize_text(assessment.prompt)
        options = [_normalize_text(option) for option in assessment.options if option.strip()]
        if len(options) != 3:
            raise ValueError("Slide assessment must include exactly three options")
        assessment_data["options"] = options
        assessment_data["correct_feedback"] = _normalize_text(assessment.correct_feedback)
        assessment_data["incorrect_feedback"] = _normalize_text(assessment.incorrect_feedback)

        assessment_index = assessment_data.get("answer_index")
        max_index = len(options) - 1
        if isinstance(assessment_index, int):
            assessment_data["answer_index"] = max(0, min(max_index, assessment_index))
        else:
            assessment_data["answer_index"] = 0

        slide_data["assessment"] = assessment_data

        sanitized_slides.append(LessonSlide.model_validate(slide_data))

    if len(objectives) != 3:
        raise ValueError("Slide generation must return exactly three learning objectives")

    if not overview or not sanitized_slides:
        raise ValueError("Slide generation returned incomplete content")
    if len(sanitized_slides) != 5:
        raise ValueError("Slide generation did not return exactly five slides")

    return LessonSlidesPayload.model_validate(
        {
            "overview": overview,
            "learningObjectives": objectives,
            "slides": [slide.model_dump(by_alias=True) for slide in sanitized_slides],
        }
    )


def _sanitize_practice_payload(practice: LessonPracticePayload) -> LessonPracticePayload:
    if len(practice.options) < 3:
        raise ValueError("Practice generation returned insufficient options")
    if not practice.question.strip():
        raise ValueError("Practice generation returned empty question")

    practice_options = [_normalize_text(option) for option in practice.options if option.strip()]
    if len(practice_options) != 3:
        raise ValueError("Practice generation must include exactly three options")

    sanitized_practice = {
        "question": _normalize_text(practice.question),
        "options": practice_options,
        "correct_option_index": practice.correct_option_index,
        "correct_feedback": _normalize_text(practice.correct_feedback),
        "incorrect_feedback": _normalize_text(practice.incorrect_feedback),
    }

    return LessonPracticePayload.model_validate(sanitized_practice)


LESSON_SYSTEM_PROMPT = (
    "You are a supportive instructional designer crafting culturally-aware slide lessons "
    "for learners. Always respond in the learner's language, deliver rich yet concise instruction, "
    "ensure every checkpoint connects directly to slide content, and output valid JSON only."
)

PRACTICE_SYSTEM_PROMPT = (
    "You create a single multiple-choice practice question with detailed feedback "
    "based strictly on the provided lesson explanation and objectives. Output well-formed JSON only."
)

ORCHESTRATOR_SYSTEM_PROMPT = """
You are the Lesson Director orchestrator. Coordinate specialised tool agents to build a lesson.

Available tools:
- slide_designer(request_json: str) → JSON string describing the lesson slides.
- practice_builder(payload_json: str) → JSON string describing the practice question.

Tool usage rules:
- Tool arguments must be valid JSON strings. Do not add commentary, Markdown, or extra quotations.
- Always call slide_designer first with the original request JSON.
- Then call practice_builder with a JSON object of the form {"request": <LessonRequest JSON>, "slides": <slides JSON>}.
- After both tools succeed, reply ONCE with a JSON object containing exactly two keys: "slides" and "practice". The values must be the tool outputs verbatim.
- If a tool call fails, report the error in your final JSON under an "error" key instead.
""".strip()


def _build_slide_prompt(request: LessonRequest, grade: str, *, compact: bool = False) -> str:
    body_range = "160-210" if not compact else "110-150"
    planning_sentence = (
        "Before writing, silently plan the learning arc so each slide builds on the previous one."
        if not compact
        else (
            "Before writing, take a brief moment to plan the learning arc. Keep responses concise to avoid running out of tokens."
        )
    )
    compact_guidance = (
        ""
        if not compact
        else "Trim optional anecdotes and keep wording tight so the full JSON fits within the token limit."
    )

    return (
        f"Create exactly five lesson slides for {request.subject} on the topic {request.topic}.\n"
        f"Learner country: {request.country}. Learner language: {request.language}. Grade level: {grade}.\n"
        f"{planning_sentence}"
        "Instructional requirements:\n"
        "1. Begin each slide body by recalling the previous idea or explaining why this slide matters next.\n"
        "2. Worked examples must show annotated reasoning steps; typeset mathematics with LaTeX using $ ... $ for inline math or $$ ... $$ for display math when appropriate.\n"
        "3. Scaffolded problems must contain three mini tasks of increasing complexity within the body text.\n"
        "4. Misconception slides must quote the misconception, debunk it, and provide an everyday-life example.\n"
        "5. Synthesis slides must connect back to at least one previous slide, preview the next topic, "
        "and use a choice assessment with correctFeedback and incorrectFeedback.\n"
        "Checkpoint rules:\n"
        "- Every assessment prompt must reference details from the slide body.\n"
        "- Choice checkpoints must provide exactly three options labelled in plain text and set the correct answerIndex.\n"
        '- Mention the "tutor" or "chat" to encourage the learner to share their response.\n'
        f"Each slide body should contain approximately {body_range} words using paragraphs and, when helpful, bullet or numbered lists. "
        "The overview must contain 3-4 sentences, and learning objectives should be three concise, action-oriented statements. "
        "Respond concisely so the tool output fits within the schema. "
        f"{compact_guidance}"
    )


def _build_practice_prompt(
    request: LessonRequest,
    grade: str,
    overview: str,
    objectives_text: str,
    slide_summaries: str,
    *,
    compact: bool = False,
) -> str:
    concise_guidance = (
        ""
        if not compact
        else "Keep the question and feedback succinct (ideally under 80 tokens total) while remaining specific."
    )

    return (
        f"Generate one formative assessment MCQ for {request.subject} on the topic {request.topic}.\n"
        f"Learner country: {request.country}. Learner language: {request.language}. Grade level: {grade}.\n"
        "Base it on this lesson overview:\n"
        f"{overview}\n"
        "Learning objectives:\n"
        f"{objectives_text}\n"
        "Slide details:\n"
        f"{slide_summaries}\n\n"
        "Write the question and options in the learner's language. Provide three concise options, mark the correct option, and craft specific feedback for both correct and incorrect answers. "
        "Keep the wording culturally relevant to the learner's country. "
        f"{concise_guidance}"
    )


async def _generate_slide_payload(
    runtime: StrandsRuntime,
    request: LessonRequest,
    *,
    max_tokens: Optional[int] = None,
) -> LessonSlidesPayload:
    grade = request.grade_level or "middle school"
    token_limit = max_tokens if max_tokens is not None else runtime.settings.lesson_slide_max_tokens
    try:
        slides = await runtime.structured_output(
            LessonSlidesPayload,
            _build_slide_prompt(request, grade),
            system_prompt=LESSON_SYSTEM_PROMPT,
            max_tokens=token_limit,
        )
    except ValueError as exc:
        message = str(exc)
        if "max_tokens" not in message.lower():
            raise
        logger.warning("Slide generation hit max_tokens; retrying with compact prompt", exc_info=exc)
        slides = await runtime.structured_output(
            LessonSlidesPayload,
            _build_slide_prompt(request, grade, compact=True),
            system_prompt=LESSON_SYSTEM_PROMPT,
            max_tokens=token_limit,
        )

    return _sanitize_slide_payload(slides)


async def _generate_practice_payload(
    runtime: StrandsRuntime,
    request: LessonRequest,
    slides_payload: LessonSlidesPayload,
    *,
    max_tokens: Optional[int] = None,
) -> LessonPracticePayload:
    grade = request.grade_level or "middle school"
    overview = _normalize_text(slides_payload.overview)
    objectives = [_normalize_text(obj) for obj in slides_payload.learning_objectives if obj.strip()]
    slides: List[LessonSlide] = list(slides_payload.slides)

    if not overview or not objectives or not slides:
        raise ValueError("Practice generation requires non-empty lesson overview, objectives, and slides")

    slide_summaries = "\n\n".join(
        f"Slide {idx + 1} ({slide.slide_type} - {slide.title}):\n{slide.body_md}"
        for idx, slide in enumerate(slides)
    )
    objectives_text = "\n".join(objectives)

    token_limit = max_tokens if max_tokens is not None else runtime.settings.lesson_practice_max_tokens

    try:
        practice = await runtime.structured_output(
            LessonPracticePayload,
            _build_practice_prompt(request, grade, overview, objectives_text, slide_summaries),
            system_prompt=PRACTICE_SYSTEM_PROMPT,
            max_tokens=token_limit,
        )
    except ValueError as exc:
        message = str(exc)
        if "max_tokens" not in message.lower():
            raise
        logger.warning("Practice generation hit max_tokens; retrying with compact prompt", exc_info=exc)
        practice = await runtime.structured_output(
            LessonPracticePayload,
            _build_practice_prompt(
                request,
                grade,
                overview,
                objectives_text,
                slide_summaries,
                compact=True,
            ),
            system_prompt=PRACTICE_SYSTEM_PROMPT,
            max_tokens=token_limit,
        )

    if len(practice.options) < 3:
        raise ValueError("Practice generation returned insufficient options")
    if not practice.question.strip():
        raise ValueError("Practice generation returned empty question")

    practice_options = [_normalize_text(option) for option in practice.options if option.strip()]
    if len(practice_options) != 3:
        raise ValueError("Practice generation must include exactly three options")

    sanitized_practice = {
        "question": _normalize_text(practice.question),
        "options": practice_options,
        "correct_option_index": practice.correct_option_index,
        "correct_feedback": _normalize_text(practice.correct_feedback),
        "incorrect_feedback": _normalize_text(practice.incorrect_feedback),
    }

    return LessonPracticePayload.model_validate(sanitized_practice)


def attach_practice_to_slides(
    slides_payload: LessonSlidesPayload,
    practice_payload: LessonPracticePayload,
) -> LessonSlidesPayload:
    slides = list(slides_payload.slides)
    if not slides:
        return slides_payload

    final_slide = slides[-1].model_dump()
    final_slide["assessment"] = {
        "type": "choice",
        "prompt": practice_payload.question,
        "options": practice_payload.options,
        "answer_index": practice_payload.correct_option_index,
        "correct_feedback": practice_payload.correct_feedback,
        "incorrect_feedback": practice_payload.incorrect_feedback,
    }
    slides[-1] = LessonSlide.model_validate(final_slide)

    return LessonSlidesPayload.model_validate(
        {
            "overview": slides_payload.overview,
            "learningObjectives": slides_payload.learning_objectives,
            "slides": [slide.model_dump(by_alias=True) for slide in slides],
        }
    )


def _build_slide_tool(runtime: StrandsRuntime, max_tokens_override: Optional[int]):
    @tool
    async def slide_designer(request_json: str) -> str:
        """
        Generate lesson slides for the provided request.

        Args:
            request_json: JSON string that matches the LessonRequest schema.

        Returns:
            JSON string that matches LessonSlidesPayload with alias keys.
        """
        request_payload = LessonRequest.model_validate(json.loads(request_json))
        slides_payload = await _generate_slide_payload(
            runtime,
            request_payload,
            max_tokens=max_tokens_override if max_tokens_override is not None else runtime.settings.lesson_slide_max_tokens,
        )
        return json.dumps(slides_payload.model_dump(by_alias=True), ensure_ascii=False)

    return slide_designer


def _build_practice_tool(runtime: StrandsRuntime, max_tokens_override: Optional[int]):
    @tool
    async def practice_builder(payload_json: str) -> str:
        """
        Generate a practice question using slide content.

        Args:
            payload_json: JSON string with keys "request" (LessonRequest) and "slides" (LessonSlidesPayload).

        Returns:
            JSON string that matches LessonPracticePayload with alias keys.
        """
        payload = json.loads(payload_json)
        request_payload = LessonRequest.model_validate(payload.get("request", {}))
        slides_payload = LessonSlidesPayload.model_validate(payload.get("slides", {}))
        practice_payload = await _generate_practice_payload(
            runtime,
            request_payload,
            slides_payload,
            max_tokens=max_tokens_override if max_tokens_override is not None else runtime.settings.lesson_practice_max_tokens,
        )
        return json.dumps(practice_payload.model_dump(by_alias=True), ensure_ascii=False)

    return practice_builder


def _build_orchestrator(
    runtime: StrandsRuntime,
    *,
    slide_max_tokens: Optional[int],
    practice_max_tokens: Optional[int],
) -> Agent:
    slide_tool = _build_slide_tool(runtime, slide_max_tokens)
    practice_tool = _build_practice_tool(runtime, practice_max_tokens)
    return runtime.make_agent(
        system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
        tools=[slide_tool, practice_tool],
        temperature=0.0,
        max_tokens=1024,
    )


async def generate_lesson_assets(
    runtime: StrandsRuntime,
    request: LessonRequest,
    *,
    slide_max_tokens: Optional[int] = None,
    practice_max_tokens: Optional[int] = None,
) -> Tuple[Dict[str, object], Dict[str, object]]:
    slide_token_limit = slide_max_tokens if slide_max_tokens is not None else runtime.settings.lesson_slide_max_tokens
    practice_token_limit = practice_max_tokens if practice_max_tokens is not None else runtime.settings.lesson_practice_max_tokens

    orchestrator = _build_orchestrator(
        runtime,
        slide_max_tokens=slide_token_limit,
        practice_max_tokens=practice_token_limit,
    )
    request_json = json.dumps(request.model_dump(by_alias=True), ensure_ascii=False)

    try:
        response = await orchestrator.structured_output_async(
            LessonAgentResponse,
            f"Lesson request JSON:\n{request_json}\nFollow the procedure above and return the final JSON.",
        )

        slides_payload = _sanitize_slide_payload(response.slides)
        practice_payload = _sanitize_practice_payload(response.practice)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Orchestrator agent failed; falling back to direct tool calls")
        slides_payload = await _generate_slide_payload(
            runtime,
            request,
            max_tokens=slide_token_limit,
        )
        practice_payload = await _generate_practice_payload(
            runtime,
            request,
            slides_payload,
            max_tokens=practice_token_limit,
        )
    else:
        logger.debug("Orchestrator agent completed successfully")

    slides_with_practice = attach_practice_to_slides(slides_payload, practice_payload)

    return (
        {
            "overview": slides_with_practice.overview,
            "learning_objectives": slides_with_practice.learning_objectives,
            "slides": slides_with_practice.slides,
        },
        {
            "question": practice_payload.question,
            "options": practice_payload.options,
            "answer_index": practice_payload.correct_option_index,
            "correct_feedback": practice_payload.correct_feedback,
            "incorrect_feedback": practice_payload.incorrect_feedback,
        },
    )


async def generate_lesson_slides(
    runtime: StrandsRuntime,
    request: LessonRequest,
) -> LessonSlidesPayload:
    return await _generate_slide_payload(
        runtime,
        request,
        max_tokens=runtime.settings.lesson_slide_max_tokens,
    )


async def generate_lesson_practice(
    runtime: StrandsRuntime,
    request: LessonRequest,
    slides_payload: LessonSlidesPayload,
) -> LessonPracticePayload:
    return await _generate_practice_payload(
        runtime,
        request,
        slides_payload,
        max_tokens=runtime.settings.lesson_practice_max_tokens,
    )
