---
name: z-py-core
description: "Maintain Python packages with uv, Ruff, mypy, pytest, and Pydantic. Use the framework references for FastAPI, Django, Flask, or data workloads. See [[z-testing-strategy]] for test scope."
---

# Python packages

## Match the project environment

Inspect `pyproject.toml`, the lockfile, and CI. Preserve an existing package manager and supported Python versions.
For a new uv project, distinguish initialization and dependency changes from checks on an existing environment.

```bash
uv init                    # new project, writes pyproject.toml
uv add fastapi             # add a runtime dep
uv add --dev pytest ruff mypy
uv sync                    # update the lock when needed, then synchronize the environment
timeout 10m uv run pytest  # run the default serial suite in the project environment
uv python pin 3.12         # pin the interpreter
```

Commit the project's `uv.lock`. Use `uv sync --locked` when setup must respect that lockfile.
Use Ruff according to the project's lint and format policies. These commands edit the working tree.

```bash
uv run ruff check --fix
uv run ruff format
```

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
```

Choose mypy settings that match the supported Python version and package layout.

```toml
[tool.mypy]
strict = true
warn_unused_ignores = true

[[tool.mypy.overrides]]
module = "legacy.*"
disallow_untyped_defs = false
```

Keep ignores local and specific, such as `# type: ignore[attr-defined]`.

## Define types at boundaries

Install and test the distribution from its supported layout. A `src/` layout helps expose imports that rely on the checkout.
Keep `__init__.py` focused on the public package interface. Implicit namespace packages can omit it.
Match generic and union syntax to the minimum Python version.
Use a `Protocol` when callers require behavior without shared implementation.

```python
class SupportsWrite(Protocol):
    def write(self, data: bytes) -> int: ...
```

Check external data at entry. For a Pydantic v2 project, select coercion, strictness, and unknown-field behavior from the input contract.

```python
class CreateUserRequest(BaseModel):
    email: str
    age: int = Field(ge=0)
```

Use typed domain models or dataclasses for trusted internal data. Avoid repeating the same boundary validation.

## Handle errors and concurrency

Catch specific errors. Preserve causes when translating failures.

```python
try:
    user = repo.get(user_id)
except KeyError as e:
    raise ValueError(f"invalid user id: {user_id}") from e
```

Reserve broad catches for boundaries that log, recover, or translate the failure. Avoid silent exception handlers.
Use async I/O with an appropriate driver. Blocking file or CPU work inside `async def` still blocks the event loop.
Keep sync-to-async transitions explicit. A thread with a running loop cannot start another loop using `asyncio.run()`.

## Check the package

Use the existing runner, fixtures, and parameterized cases. Set an overall deadline and a finite worker count for parallel tests.
A pytest per-test timeout requires the installed plugin. See [[z-testing-strategy]].

```bash
uv run ruff check
uv run mypy .
timeout 10m uv run pytest --timeout=60   # requires pytest-timeout; cap workers if xdist is enabled
```

Read the applicable [FastAPI](references/fastapi.md), [Django](references/django.md), [Flask](references/flask.md), or [data](references/data.md) reference.
Use [[z-no-over-engineering]] when choosing new dependencies.
