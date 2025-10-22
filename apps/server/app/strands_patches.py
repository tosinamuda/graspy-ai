from __future__ import annotations

import logging
from typing import Any, AsyncGenerator, Optional, Type, Union, cast

from pydantic import BaseModel
from strands.event_loop import streaming  # type: ignore[import-not-found]
from strands.models.bedrock import BedrockModel, convert_pydantic_to_tool_spec  # type: ignore[import-not-found]
from strands.types.content import Messages  # type: ignore[import-not-found]
from strands.types.tools import ToolChoice  # type: ignore[import-not-found]

logger = logging.getLogger(__name__)

if not logger.handlers:
    logger.addHandler(logging.NullHandler())


def _coerce_tool_choice(tool_choice: Optional[ToolChoice], tool_name: str) -> ToolChoice:
    if tool_choice and "tool" in tool_choice:
        return tool_choice
    return cast(ToolChoice, {"tool": {"name": tool_name}})


async def _structured_output_with_explicit_tool_choice(
    self: BedrockModel,
    output_model: Type[BaseModel],
    prompt: Messages,
    system_prompt: Optional[str] = None,
    *,
    tool_choice: Optional[ToolChoice] = None,
    **kwargs: Any,
) -> AsyncGenerator[dict[str, Union[BaseModel, Any]], None]:
    tool_spec = convert_pydantic_to_tool_spec(output_model)
    effective_tool_choice = _coerce_tool_choice(tool_choice, tool_spec["name"])

    response = self.stream(
        messages=prompt,
        tool_specs=[tool_spec],
        system_prompt=system_prompt,
        tool_choice=effective_tool_choice,
        **kwargs,
    )

    async for event in streaming.process_stream(response):
        yield event

    stop_reason, messages, _, _ = event["stop"]
    if stop_reason not in {"tool_use", "end_turn"}:
        raise ValueError(f'Model returned stop_reason: {stop_reason} instead of "tool_use".')

    output_response: Optional[dict[str, Any]] = None
    tool_name = effective_tool_choice["tool"]["name"]
    for block in messages["content"]:
        payload = block.get("toolUse")
        if payload and payload.get("name") == tool_name:
            output_response = payload.get("input")
            break

    if output_response is None:
        raise ValueError("No valid tool use or tool use input was found in the Bedrock response.")

    yield {"output": output_model(**output_response)}


def patch_bedrock_structured_output() -> None:
    if getattr(BedrockModel.structured_output, "_graspy_patched", False):
        return

    original = BedrockModel.structured_output

    async def wrapped(
        self: BedrockModel,
        output_model: Type[BaseModel],
        prompt: Messages,
        system_prompt: Optional[str] = None,
        **kwargs: Any,
    ):
        tool_choice = cast(Optional[ToolChoice], kwargs.pop("tool_choice", None))
        async for event in _structured_output_with_explicit_tool_choice(
            self,
            output_model,
            prompt,
            system_prompt=system_prompt,
            tool_choice=tool_choice,
            **kwargs,
        ):
            yield event

    wrapped._graspy_patched = True  # type: ignore[attr-defined]
    BedrockModel._structured_output_original = original  # type: ignore[attr-defined]
    BedrockModel.structured_output = wrapped  # type: ignore[assignment]
