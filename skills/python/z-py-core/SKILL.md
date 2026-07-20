---
name: z-py-core
description: Python tooling and idiom baseline — uv for env/deps, ruff lint+format, mypy strict-leaning, pytest, pydantic v2 at the boundary. Routes to references for FastAPI, Django, Flask, or data (polars/pandas) work. Triggers on "uv sync", "ruff check", "pydantic model". Does not cover test-depth choice; see [[z-testing-strategy]].
---

# Python core

House Python stack: `uv` for env and deps, `ruff` for lint and format, mypy strict-leaning, `pytest`, pydantic v2 at IO boundaries. Route to the matching reference for framework or data work.

## Tooling

`uv` is the default — replaces pip, venv, virtualenv, and pip-tools:

```bash
uv init                    # new project, writes pyproject.toml
uv add fastapi             # add a runtime dep
uv add --dev pytest ruff mypy
uv sync                    # install from lockfile
uv run pytest              # run inside the project's venv
uv python pin 3.12         # pin the interpreter
```

Commit `uv.lock`. Use pip or poetry only when a project already runs on one of them — don't migrate an incumbent project unasked.

`ruff` does both lint and format — never pair it with black/isort/flake8, pick one formatter:

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

mypy strict-leaning, not full strict from day one on an existing codebase:

```toml
[tool.mypy]
strict = true
warn_unused_ignores = true

[[tool.mypy.overrides]]
module = "legacy.*"
disallow_untyped_defs = false
```

Escape hatches stay narrow: `# type: ignore[attr-defined]` with the error code attached, never a bare `# type: ignore`.

## Project layout

`src/` layout — `src/pkgname/`, tests in `tests/` outside the package. Forces the package to be imported as installed, catching accidental relative-import bugs that a flat layout hides.

`__init__.py` re-exports the public surface; don't drop logic into it. Empty is fine for a pure namespace package.

## Typing

- Builtin generics: `list[str]`, `dict[str, int]` — not `List`/`Dict` from `typing`.
- `X | Y` unions, `X | None` — not `Union[X, Y]`, not `Optional[X]`.
- `Protocol` for a structural seam (duck-typed interface) instead of an ABC when there's no shared implementation to inherit:

```python
class SupportsWrite(Protocol):
    def write(self, data: bytes) -> int: ...
```

- No `Any` crossing a function boundary. If a value's type is genuinely unknown at the edge (deserialized JSON, `**kwargs`), narrow or validate it before it reaches typed code — don't let `Any` propagate.

## Validation and data shapes

pydantic v2 `BaseModel` at IO edges — HTTP request/response, config, external API payloads. Validates once, at the boundary:

```python
class CreateUserRequest(BaseModel):
    email: str
    age: int = Field(ge=0)
```

Plain `@dataclass` for internal domain shapes once validated data has crossed the boundary — no per-field validation overhead, no pydantic coupling deeper in the call stack. Reaching for `BaseModel` everywhere because it's already imported is the over-engineering trap here; see [[z-no-over-engineering]].

## Testing

`pytest`, not `unittest`, for new code:

- Fixtures over `setUp`/`tearDown`.
- `@pytest.mark.parametrize` over copy-pasted test methods.
- How much to cover isn't a pytest question — see [[z-testing-strategy]].

## Errors

Raise with context, keep the chain:

```python
try:
    user = repo.get(user_id)
except KeyError as e:
    raise ValueError(f"invalid user id: {user_id}") from e
```

Catch specific exception types. A bare `except Exception` belongs only at a real top-level boundary — a task runner, a request handler — where it's logged and either re-raised or converted to a response. Never `except: pass`.

## Async

`asyncio` only when the workload is actually IO-bound — network, disk, subprocess. Wrapping a CPU-bound loop in `async def` buys nothing; it still blocks the event loop.

Don't mix sync and async call paths in one component. Calling `asyncio.run()` from inside a thread that's already running a loop deadlocks; pick one discipline per component and keep the boundary where sync meets async explicit (a thread pool executor, not an ad hoc `run_until_complete`).

## Framework routing

| Building | Reference |
|---|---|
| FastAPI service | [[references/fastapi.md]] |
| Django app | [[references/django.md]] |
| Flask app (often inherited) | [[references/flask.md]] |
| Data pipeline, notebook, or LLM client | [[references/data.md]] |

Read the matching reference before writing framework-specific code — this file covers the language and tooling baseline that applies regardless of framework.

## Do not

- Hand-roll a `venv` + `pip install` workflow on a new project — use `uv`.
- Run black or isort alongside ruff.
- Validate the same payload twice — once at the pydantic boundary, then again by hand deeper in.
- Leave a bare `# type: ignore` without the error code.
- Reach for `unittest.TestCase` in new test code.

## Verify

```bash
uv run ruff check
uv run mypy .
uv run pytest
```

see [[z-testing-strategy]], [[z-no-over-engineering]]
