from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Optional, Sequence, Type, TypeVar
from pydantic import BaseModel, ValidationError

from ..settings import Settings
from ..strands_patches import patch_bedrock_structured_output

patch_bedrock_structured_output()

TModel = TypeVar("TModel", bound=BaseModel)

logger = logging.getLogger(__name__)


class StrandsRuntime:
    """
    Thin helper around the Strands Agent SDK.

    This runtime follows Strands Agents SDK best practices:
    - Use structured_output() for typed responses WITHOUT tools
    - Use invoke() for orchestrators WITH tools
    - Use stream() for real-time streaming with tools

    There is intentionally no local fallback: if the SDK or credentials are
    misconfigured we surface the error to the caller so it can be handled upstream.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def settings(self) -> Settings:
        return self._settings

    async def structured_output(
        self,
        model: Type[TModel],
        prompt: str,
        *,
        system_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> TModel:
        """
        Invoke an agent and return a typed response using structured_output.

        IMPORTANT: Do NOT use this with tools. Tools are incompatible with
        structured_output. The Pydantic model becomes the only available tool,
        and any other tools you provide will be ignored.

        Use invoke() instead if you need to coordinate multiple tools.

        Args:
            model: Pydantic model defining the output structure
            prompt: User prompt describing what to generate
            system_prompt: System instructions (do NOT mention "JSON" or "schema")
            temperature: Model temperature override
            max_tokens: Max tokens override

        Returns:
            Validated Pydantic model instance

        Best Practices:
            - System prompt should focus on WHAT to generate, not format
            - Never mention "JSON", "schema", or "structure" in prompts
            - Let Pydantic field descriptions guide the model
            - Use Field() with descriptions for clarity
        """
        logger.debug(
            "Invoking Strands structured_output",
            extra={
                "model": model.__name__,
                "system_prompt_preview": system_prompt[:60],
            },
        )
        agent = self.make_agent(
            system_prompt=system_prompt,
            tools=[],  # Always empty for structured_output
            temperature=temperature,
            max_tokens=max_tokens,
        )
        try:
            return await agent.structured_output_async(model, prompt)  # type: ignore[attr-defined]
        except ValidationError as exc:
            msg = f"Strands structured output failed validation for model '{model.__name__}'"
            logger.exception(msg)
            raise ValueError(msg) from exc

    async def invoke(
        self,
        prompt: str,
        *,
        system_prompt: str,
        tools: Sequence[Any],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Invoke an orchestrator agent with tools.

        Use this when the agent needs to coordinate multiple specialized agents
        or tools. The agent will decide which tools to call and when.

        Args:
            prompt: User prompt describing the task
            system_prompt: System instructions explaining available tools and workflow
            tools: List of @tool decorated functions or agent tools
            temperature: Model temperature override
            max_tokens: Max tokens override

        Returns:
            String response from the agent (parse as needed)

        Best Practices:
            - System prompt should list all available tools with descriptions
            - Explain the workflow/order of tool calls
            - Tool docstrings are critical - the model reads them to decide when to call
            - Use temperature=0.0 for deterministic orchestration
        """
        logger.debug(
            "Invoking Strands orchestrator",
            extra={
                "num_tools": len(tools),
                "system_prompt_preview": system_prompt[:60],
            },
        )
        agent = self.make_agent(
            system_prompt=system_prompt,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        result = await agent.invoke_async(prompt)  # type: ignore[attr-defined]
        return str(result)

    async def stream(
        self,
        prompt: str,
        *,
        system_prompt: str,
        tools: Sequence[Any],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Stream events from an agent with tools.

        NOTE: Streaming is disabled with structured_output. Only use this
        with invoke-style agents that have tools.

        Args:
            prompt: User prompt describing the task
            system_prompt: System instructions
            tools: List of @tool decorated functions
            temperature: Model temperature override
            max_tokens: Max tokens override

        Yields:
            Event dictionaries containing:
            - "data": Text chunks from the model
            - "current_tool_use": Tool being called
            - "tool_result": Result from tool execution
            - "result": Final complete response
            - "error": Error information if failure

        Best Practices:
            - Set callback_handler=None when creating sub-agents
            - Process events in real-time for lower latency UX
            - Handle all event types (data, current_tool_use, tool_result, result, error)
        """
        logger.debug(
            "Streaming Strands agent",
            extra={
                "num_tools": len(tools),
                "system_prompt_preview": system_prompt[:60],
            },
        )
        agent = self.make_agent(
            system_prompt=system_prompt,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        async for event in agent.stream_async(prompt):  # type: ignore[attr-defined]
            yield event

    def make_agent(
        self,
        *,
        system_prompt: str,
        tools: Optional[Sequence[Any]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Any:
        try:
            from strands import Agent  # type: ignore[import-not-found]
            from strands.models import BedrockModel  # type: ignore[import-not-found]
        except Exception as exc:  # noqa: BLE001
            msg = (
                "Strands Agent SDK is not available; "
                "install 'strands-agents' and related packages to continue.",
            )
            logger.exception(msg)
            raise RuntimeError(msg) from exc

        provider_kwargs: dict[str, Any] = {
            "model_id": self._settings.strands_model_id,
        }

        if self._settings.bedrock_region:
            provider_kwargs["region_name"] = self._settings.bedrock_region

        inference_config: dict[str, Any] = {}

        temperature_override = (
            temperature if temperature is not None else self._settings.strands_default_temperature
        )
        if temperature_override is not None:
            inference_config["temperature"] = temperature_override

        token_limit = max_tokens if max_tokens is not None else self._settings.strands_max_tokens
        if token_limit:
            inference_config["maxTokens"] = token_limit

        if self._settings.strands_default_top_k is not None:
            inference_config.setdefault("topK", self._settings.strands_default_top_k)

        if self._settings.strands_default_top_p is not None:
            inference_config.setdefault("topP", self._settings.strands_default_top_p)

        if inference_config:
            provider_kwargs["additional_request_fields"] = {
                "inferenceConfig": inference_config,
            }

        logger.debug("Creating Bedrock model provider", extra={"provider_kwargs": provider_kwargs})

        try:
            model_provider = BedrockModel(**provider_kwargs)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to initialise Bedrock model provider")
            raise

        return Agent(
            model=model_provider,
            system_prompt=system_prompt,
            tools=list(tools) if tools else [],
            callback_handler=None,
        )
