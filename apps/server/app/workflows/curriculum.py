from __future__ import annotations

import re
from typing import Dict, List

from ..schemas import CurriculumRequest, CurriculumSubject, CurriculumSubjects, CurriculumTopics
from ..services.strands import StrandsRuntime

CURRICULUM_PLANNER_SP = (
    "You are a curriculum planner with knowledge of all approved subjects by a particular country available to a grade level to take"
    "The subject mentioned must match the age or grade level."
    "Focus on concise, culturally aware, age-appropriate content in the requested language. "
    "Return only the fields required by the schema and nothing else."
)


def _sanitize_sequence(values: List[str], *, limit: int) -> List[str]:
    cleaned: List[str] = []
    for item in values:
        candidate = item.strip()
        if not candidate:
            continue
        cleaned.append(candidate)
        if len(cleaned) >= limit:
            break
    return cleaned


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "subject"


def _normalize_subjects(entries: List[str]) -> List[CurriculumSubject]:
    normalized: List[CurriculumSubject] = []
    seen: set[str] = set()
    for name in entries:
        base = _slugify(name)
        slug = base
        suffix = 2
        while slug in seen:
            slug = f"{base}-{suffix}"
            suffix += 1
        seen.add(slug)
        normalized.append(CurriculumSubject(name=name, slug=slug))
    return normalized


def _describe_grade_level(level: str | None) -> str:
    if not level:
        return "middle school learners"

    value = level.strip().lower()
    if value == "beginner":
        return "early primary learners (ages 6-8)"
    if value == "elementary":
        return "upper primary learners (ages 9-11)"
    if value == "middle":
        return "middle school learners (ages 12-14)"
    if value == "high":
        return "secondary school learners (ages 15-17)"
    return level


async def generate_curriculum_plan(
    runtime: StrandsRuntime,
    request: CurriculumRequest,
) -> tuple[List[CurriculumSubject], Dict[str, List[str]]]:
    subjects = await generate_subject_list(runtime, request)
    topics = await generate_topic_map(runtime, request, subjects)
    return subjects, topics


async def generate_subject_list(
    runtime: StrandsRuntime,
    request: CurriculumRequest,
) -> List[CurriculumSubject]:
    preferred = _sanitize_sequence(request.subjects or [], limit=20)
    if preferred:
        return _normalize_subjects(preferred)

    grade_label = _describe_grade_level(request.grade_level)

    result = await runtime.structured_output(
        CurriculumSubjects,
        (
            "Generate a broad list of core school subjects for the learner.\n"
            f"Country: {request.country}\n"
            f"Language of instruction: {request.language}\n"
            f"Grade level: {grade_label}\n\n"
            "Reference for typical maximum subjects taken in common national exams:\n"
            "- United States: 7\n"
            "- United Kingdom (GCSEs): 11\n"
            "- Singapore (O-Levels): 9\n"
            "- South Africa (NSC): 7\n"
            "- Nigeria (WASSCE): 9\n"
            "- Ghana (WASSCE/SHS): 9\n"
            "- India (CBSE Class 12): 6\n"
            "- Germany (Gymnasiale Oberstufe intro phase): 12\n"
            "- Kenya (CBC Senior School): 7\n"
            "- Australia (NSW HSC/VCE): 6\n\n"
            "Rules:\n"
            "- Return between 8 and 12 distinct subjects\n"
            "- Use official, ministry-recognised subject names (e.g., English, Mathematics, Science)\n"
            "- Avoid electives, labs, or subtopics\n"
            "- Respond strictly with the schema's 'subjects' array"
        ),
        system_prompt=CURRICULUM_PLANNER_SP,
    )
    cleaned = _sanitize_sequence(result.subjects, limit=12)
    return _normalize_subjects(cleaned)

async def generate_topic_map(
    runtime: StrandsRuntime,
    request: CurriculumRequest,
    subjects: List[CurriculumSubject],
) -> Dict[str, List[str]]:
    grade_label = _describe_grade_level(request.grade_level)

    topics: Dict[str, List[str]] = {}
    for subject in subjects:
        result = await runtime.structured_output(
            CurriculumTopics,
            (
                "Create a progressive list of teachable topics for the subject.\n"
                f"Subject: {subject.name}\n"
                f"Country: {request.country}\n"
                f"Language of instruction: {request.language}\n"
                f"Grade level: {grade_label}\n\n"
                "Rules:\n"
                "- Return 5 to 7 topics ordered from foundational to more advanced\n"
                "- Keep titles short and student-friendly\n"
                "- Avoid duplicates and overly granular sub-points\n"
                "- Respond strictly with the schema's 'topics' array"
            ),
            system_prompt=CURRICULUM_PLANNER_SP,
        )
        topics[subject.slug] = _sanitize_sequence(result.topics, limit=7)
    return topics
