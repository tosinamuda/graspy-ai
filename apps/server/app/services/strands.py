from __future__ import annotations

import logging
from typing import Any, Optional, Sequence, Type, TypeVar
from pydantic import BaseModel, ValidationError

from ..settings import Settings
from ..strands_patches import patch_bedrock_structured_output

patch_bedrock_structured_output()

TModel = TypeVar("TModel", bound=BaseModel)

logger = logging.getLogger(__name__)


class StrandsRuntime:
    """
    Thin helper around the Strands Agent SDK.

    It creates Bedrock-backed agents on demand and exposes a single async
    structured_output helper. There is intentionally no local fallback: if the
    SDK or credentials are misconfigured we surface the error to the caller so
    it can be handled upstream.
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
        tools: Optional[Sequence[Any]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> TModel:
        """
        Invoke an agent with the provided system prompt and return a typed
        response using Strands' structured_output API.
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
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        try:
            return await agent.structured_output_async(model, prompt)  # type: ignore[attr-defined]
        except ValidationError as exc:
            msg = f"Strands structured output failed validation for model '{model.__name__}'"
            logger.exception(msg)
            raise ValueError(msg) from exc

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
