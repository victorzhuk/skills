# Flask

Flask work is usually inherited code, not a greenfield choice. Orient around fixing structure incrementally, not just adding features on top of what's there.

## Target shape: app factory + blueprints

```python
# app.py
def create_app(config: type[Config] = ProductionConfig) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config)

    db.init_app(app)
    from .routes import users
    app.register_blueprint(users.bp)

    return app
```

```python
# routes/users.py
bp = Blueprint("users", __name__, url_prefix="/users")

@bp.route("/<int:user_id>")
def get_user(user_id: int): ...
```

A factory function instead of a module-level `app = Flask(__name__)` is what makes config-per-environment and test isolation possible — each test gets its own app instance instead of sharing global state with every other test.

## Extension init pattern

Declare the extension unbound at module level, bind it inside the factory:

```python
db = SQLAlchemy()  # unbound

def create_app() -> Flask:
    app = Flask(__name__)
    db.init_app(app)  # bound here
    return app
```

This is what avoids the circular import between `models.py` (needs `db`) and `app.py` (needs the models registered) — both import the unbound `db` object, and only `create_app` ties them together.

## Common legacy hazards

- **Module-level app with routes registered at import time.** `app = Flask(__name__)` plus `@app.route` decorators scattered across files that get imported for their side effects. Breaks testing (can't spin up a second instance with different config) and makes route registration order-dependent on import order.
- **Circular imports.** `app.py` imports `routes`, `routes` imports `app` to get the `app` or `db` object. Fixed by the factory + unbound-extension pattern above, or by moving shared objects to their own module.
- **Missing app context.** `RuntimeError: Working outside of application context` when `current_app`, `g`, or `url_for` is called outside a request — common in scripts, CLI commands, or background jobs. Wrap with `with app.app_context():` before touching anything that needs it.

## Migration path judgment

Not every inherited Flask app needs a rewrite:

- **Stay** — small app, low churn, already close to the factory + blueprint shape. Leave it.
- **Refactor incrementally** — medium size, real churn, module-level app but decent test coverage. Extract blueprints one at a time, introduce the factory, keep the app running throughout.
- **Rewrite** — module-level app deeply coupled to global state, no meaningful tests, changes routinely break unrelated routes. Rebuilding against a fresh app-factory skeleton is cheaper than untangling it in place.

Decide by churn rate and existing test coverage, not by how dated the code looks — a stable, rarely-touched legacy app isn't worth the rewrite risk.

## Testing

```python
@pytest.fixture
def app() -> Flask:
    return create_app(TestConfig)

@pytest.fixture
def client(app: Flask):
    return app.test_client()

def test_get_user(client) -> None:
    response = client.get("/users/1")
    assert response.status_code == 200
```

The `app` fixture is what makes the factory pattern pay off in tests — a fresh, isolated instance per test run instead of one shared global `app` that accumulates state across the suite.
