# Graspy Python Backend

A FastAPI agentic backend powered by AWS Strands Agent SDK.

## Features

- `/api/users/*` JSON-file backed CRUD matching the previous mock ORM.
- `/api/curriculum/generate` and `/api/curriculum/generate-stream` for synchronous and SSE curriculum creation.
- `/api/curriculum/lesson` (GET/POST) for lesson sessions with structured lesson payloads.
- Pluggable Strands Agent client: uses AWS Strands when credentials are available, falls back to deterministic scaffolding for local dev.

## Environment

| Variable                        | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `PORT`                          | Port uvicorn listens on (default `8081`)                |
| `CORS_ORIGINS`                  | Comma separated list or JSON array of allowed origins   |
| `BEDROCK_AWS_REGION`            | AWS region for Strands / Bedrock                        |
| `BEDROCK_AWS_ACCESS_KEY_ID`     | AWS access key                                          |
| `BEDROCK_AWS_SECRET_ACCESS_KEY` | AWS secret key                                          |
| `BEDROCK_AWS_SESSION_TOKEN`     | Optional session token for temporary creds              |
| `STRANDS_MODEL_ID`              | Bedrock model id (defaults to `amazon.nova-lite-v1:0`)  |
| `STRANDS_AGENT_ID`              | Optional agent id if you orchestrate Bedrock Agents     |
| `STRANDS_AGENT_ALIAS_ID`        | Optional agent alias id                                 |
| `STRANDS_FORCE_FALLBACK`        | Set to `true` to disable Strands calls during local dev |

User data is stored at `app/data/users.json` by default. Override with `PY_SERVER_USER_DB`.

## Setup

```bash
cd apps/py-server
uv sync
```

This pulls `fastapi`, `strands-agents`, `strands-agents-tools`, and `strands-agents-builder`. Use `uv add <package>` to include any additional dependencies (for example, `uv add boto3`).

## Run

```bash
uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8081} --reload
```

This exposes the familiar Express-era routes on `/api`. Interactive docs live at `/api/docs`.

## Notes

- The Strands runtime is a thin helper around `Agent.structured_output`; there is no local fallback, so fix credentials/install errors rather than masking them.
- Curriculum and lesson routes run through tiny Strands workflows (subjects → topics, explanation → practice) so you get type-safe responses without manual orchestration code.
- SSE streaming uses `EventSourceResponse`; browsers connect with `EventSource("/api/curriculum/generate-stream?...")`.
