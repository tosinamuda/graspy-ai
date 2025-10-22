from __future__ import annotations

import json
import logging
from typing import Dict, List, Optional

from strands import tool  # type: ignore[import-not-found]

from ..schemas import (
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
    "for learners. Always respond in the learner's language and deliver rich yet concise instruction. "
    "Ensure every checkpoint connects directly to slide content."
)

PRACTICE_SYSTEM_PROMPT = (
    "You create a single multiple-choice practice question with detailed feedback "
    "based strictly on the provided lesson explanation and objectives."
)

ORCHESTRATOR_SYSTEM_PROMPT = """
You are the Lesson Director orchestrator. Coordinate specialized tool agents to build a lesson.

Available tools:

1. **slide_designer** - Generates complete lesson slides with learning objectives and assessments
   - Input: JSON string matching LessonRequest schema (topic, subject, language, country, grade)
   - Output: JSON string with lesson overview, learning objectives, and five slides
   - Use when: You need to create the initial lesson content

2. **practice_builder** - Creates a formative assessment question based on lesson slides
   - Input: JSON string with "request" (LessonRequest) and "slides" (LessonSlidesPayload)
   - Output: JSON string with practice question, options, and feedback
   - Use when: Lesson slides are ready and you need a practice question

CRITICAL WORKFLOW:
1. ALWAYS call slide_designer FIRST with the original lesson request JSON
2. THEN call practice_builder SECOND with both the request and slides from slide_designer
3. After both tools succeed, respond with a JSON object containing exactly two keys:
   - "slides": the output from slide_designer (verbatim)
   - "practice": the output from practice_builder (verbatim)
4. If a tool fails, report the error under an "error" key

Tool argument rules:
- Tool arguments must be valid JSON strings
- Do not add commentary, Markdown formatting, or extra quotations
- Pass tool outputs verbatim to subsequent tools

Focus on delegating to the right tools at the right time. Be concise in your coordination.
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
        "Keep responses focused and concise. "
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
        Generate culturally-aware lesson slides with learning objectives and assessments.

        This specialized agent creates comprehensive lesson content including an overview,
        learning objectives, and five instructional slides. Each slide contains rich content
        with worked examples, scaffolded problems, or synthesis activities, plus assessments.

        Capabilities:
        - Creates overview (3-4 sentences) summarizing the lesson
        - Generates three action-oriented learning objectives
        - Builds five slides with titles, bodies (160-210 words), and assessments
        - Supports LaTeX math notation for STEM subjects
        - Adapts content to learner's language, country, and grade level
        - Includes choice-based checkpoints connected to slide content

        Args:
            request_json: JSON string with fields:
                - topic: Topic to teach (e.g., "photosynthesis", "fractions")
                - subject: Subject area (e.g., "Biology", "Mathematics")
                - language: Learner's language (e.g., "English", "Spanish")
                - country: Learner's country for cultural context
                - gradeLevel: Grade level (e.g., "Grade 5", "middle school")

        Returns:
            JSON string containing:
                - overview: Lesson summary
                - learningObjectives: Array of 3 objectives
                - slides: Array of 5 slide objects with titles, bodies, and assessments

        Example Input:
            {
                "topic": "Quadratic Equations",
                "subject": "Mathematics",
                "language": "English",
                "country": "USA",
                "gradeLevel": "Grade 9"
            }
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
        Create a formative assessment question based on completed lesson slides.

        This specialized agent generates a multiple-choice practice question that tests
        understanding of the lesson content. The question is based on the lesson overview,
        learning objectives, and slide details to ensure alignment with what was taught.

        Capabilities:
        - Creates context-appropriate practice questions
        - Generates three plausible answer options
        - Identifies the correct answer
        - Provides specific feedback for correct and incorrect responses
        - Maintains cultural relevance to learner's country
        - Uses learner's language for all content

        Args:
            payload_json: JSON string with two keys:
                - request: LessonRequest object (topic, subject, language, country, gradeLevel)
                - slides: LessonSlidesPayload object (overview, learningObjectives, slides array)

        Returns:
            JSON string containing:
                - question: The practice question text
                - options: Array of 3 answer choices
                - correctOptionIndex: Index of the correct answer (0-2)
                - correctFeedback: Feedback shown when answer is correct
                - incorrectFeedback: Feedback shown when answer is incorrect

        Example Input:
            {
                "request": {"topic": "Photosynthesis", "subject": "Biology", ...},
                "slides": {"overview": "...", "learningObjectives": [...], "slides": [...]}
            }
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


async def generate_lesson_assets(
    runtime: StrandsRuntime,
    request: LessonRequest,
    *,
    slide_max_tokens: Optional[int] = None,
    practice_max_tokens: Optional[int] = None,
) -> tuple[Dict[str, object], Dict[str, object]]:
    """
    Generate lesson slides and practice question using orchestrator pattern.

    This uses the agents-as-tools pattern where an orchestrator coordinates
    two specialized agents: slide_designer and practice_builder.

    Args:
        runtime: StrandsRuntime instance
        request: Lesson generation request
        slide_max_tokens: Override for slide generation token limit
        practice_max_tokens: Override for practice generation token limit

    Returns:
        Tuple of (slides_dict, practice_dict)
    """
    slide_token_limit = slide_max_tokens if slide_max_tokens is not None else runtime.settings.lesson_slide_max_tokens
    practice_token_limit = practice_max_tokens if practice_max_tokens is not None else runtime.settings.lesson_practice_max_tokens

    # Build specialized agent tools
    slide_tool = _build_slide_tool(runtime, slide_token_limit)
    practice_tool = _build_practice_tool(runtime, practice_token_limit)

    request_json = json.dumps(request.model_dump(by_alias=True), ensure_ascii=False)

    try:
        # Use invoke() for orchestrator with tools (NOT structured_output)
        # The orchestrator will call the tools and return a JSON string
        response_text = await runtime.invoke(
            f"Lesson request JSON:\n{request_json}\n\nFollow the procedure above and return the final JSON.",
            system_prompt=ORCHESTRATOR_SYSTEM_PROMPT,
            tools=[slide_tool, practice_tool],
            temperature=0.0,
            max_tokens=1024,
        )

        # Parse the orchestrator's JSON response
        response_data = json.loads(response_text)

        # Validate and sanitize the payloads
        slides_payload = _sanitize_slide_payload(
            LessonSlidesPayload.model_validate(response_data["slides"])
        )
        practice_payload = _sanitize_practice_payload(
            LessonPracticePayload.model_validate(response_data["practice"])
        )
        logger.debug("Orchestrator agent completed successfully")

    except Exception as exc:  # noqa: BLE001
        logger.exception("Orchestrator agent failed; falling back to direct tool calls")
        # Fallback: call tools directly without orchestration
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
