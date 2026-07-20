# FastAPI

## Router organization

One `APIRouter` per resource, mounted with a versioned prefix in the app assembly, not scattered `@app.get` decorators on the root app:

```python
# routers/users.py
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}")
async def get_user(user_id: int, ...) -> UserResponse: ...

# main.py
app.include_router(users.router, prefix="/api/v1")
```

Keeps route registration testable in isolation and makes the versioned-prefix decision live in one place.

## Dependency injection

`Depends` is the seam for anything request-scoped — a DB session, the current user, a feature-flag check:

```python
def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    ...

@router.get("/me")
async def read_me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)
```

Chain dependencies (auth depends on session) instead of duplicating session setup per handler. In tests, override with `app.dependency_overrides[get_session] = lambda: test_session` — don't monkeypatch the real one.

## Request/response models

pydantic models cross the wire; ORM objects never do. A response model that returns a SQLAlchemy instance directly leaks columns you didn't mean to expose and breaks the moment the schema drifts from the API contract.

```python
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, session: Session = Depends(get_session)) -> UserResponse:
    user = session.get(User, user_id)
    return UserResponse.model_validate(user)
```

Separate read and write schemas (`UserCreate` vs `UserResponse`) when the writable fields differ from the readable ones — a single shared model invites either an over-permissive write or an under-populated read.

## async def vs def

`async def` only when the handler actually awaits something — a DB driver, an HTTP call, `asyncio.sleep`. A plain `def` handler runs in FastAPI's threadpool automatically; forcing `async def` on a sync DB driver (e.g. sync SQLAlchemy) blocks the event loop for every other request instead of just a thread.

Don't call a sync, blocking library from inside `async def` without offloading it (`run_in_threadpool` or a sync driver via `def`) — that's the single most common way to stall a FastAPI service under load.

## Background tasks

`BackgroundTasks` runs fire-and-forget work after the response is sent, in-process:

```python
@router.post("/signup")
async def signup(data: SignupRequest, background_tasks: BackgroundTasks) -> UserResponse:
    user = create_user(data)
    background_tasks.add_task(send_welcome_email, user.email)
    return user
```

It is not a task queue. No retries, no persistence — a restart between task-add and task-run loses it silently. Anything that needs a retry policy, a delay, or to survive a deploy belongs in a real queue (Celery, arq, RQ), not `BackgroundTasks`.

## Testing

`TestClient` (sync, wraps httpx) for straightforward request/response checks:

```python
def test_get_user(client: TestClient) -> None:
    response = client.get("/api/v1/users/1")
    assert response.status_code == 200
```

`httpx.AsyncClient` with `ASGITransport` when the test itself needs to run inside an event loop — testing an async dependency chain, or when the app talks to something else async during the request:

```python
async def test_get_user_async() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/users/1")
        assert response.status_code == 200
```

Override dependencies per test via `app.dependency_overrides`, clear them in a fixture teardown so one test's override doesn't leak into the next.

## Settings

`pydantic-settings` `BaseSettings` for config — reads env vars and `.env` with the same validation pydantic gives request bodies:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    database_url: str
    debug: bool = False

settings = Settings()
```

Instantiate once at import time (or behind `lru_cache` if constructing it is expensive), inject via `Depends(get_settings)` where a handler needs it — don't read `os.environ` directly inside route handlers.
