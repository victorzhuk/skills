# Django

## App decomposition

One app per bounded domain concept — `billing`, `catalog`, `accounts` — not one app per model. A dozen single-model apps just scatters `INSTALLED_APPS` and forces cross-app imports for anything that touches two related models. Split when two concepts stop sharing migrations and start being deployed or owned independently, not before.

## ORM discipline

`select_related` for FK/O2O, `prefetch_related` for M2M and reverse-FK — the default N+1 fix:

```python
# N+1: one query per order to fetch its customer
orders = Order.objects.all()

# one query, joined
orders = Order.objects.select_related("customer")

# reverse FK / M2M — separate query, joined in Python
orders = Order.objects.prefetch_related("line_items")
```

Catch the ones you miss with `django-debug-toolbar` in dev or `nplusone` in CI, not by eyeballing the query log.

QuerySets are lazy — `.filter()` chains don't hit the DB until iterated, `len()`'d, or `list()`'d. Build the full filter chain before forcing evaluation; evaluating early and filtering the Python list afterward defeats the point of the ORM.

No raw SQL without parameter binding:

```python
# bad — string interpolation, SQL injection
cursor.execute(f"SELECT * FROM orders WHERE customer_id = {customer_id}")

# good — parameterized
cursor.execute("SELECT * FROM orders WHERE customer_id = %s", [customer_id])
```

## Migrations

`makemigrations` output is not ship-and-forget — read the generated file before committing it. A schema change that needs a data backfill (new required column, data reshape) needs a paired data migration using `RunPython`, run before the schema migration that adds the constraint, not after.

Review every migration in code review like any other diff: does it lock the table on a large dataset, does it need `atomic = False` for a concurrent index, does the reverse (`RunPython`'s second arg) actually undo it.

## Admin

Django admin is a working internal tool for free — register a model before hand-building a bespoke CRUD screen for internal use:

```python
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("customer__email",)
    readonly_fields = ("created_at",)
```

`readonly_fields` for anything that should be visible but not editable from the admin — an audit trail, a computed total.

## DRF (at concept level)

Django REST Framework serializers play the same role pydantic plays in FastAPI: validate and shape data at the boundary. `ModelSerializer` for straightforward CRUD, a plain `Serializer` when the shape diverges from the model. `ViewSet` + `Router` wires URL patterns to CRUD methods without hand-writing each route. Whether a project uses DRF at all is a per-project call — this is orientation, not a mandate.

## Settings per environment

Split settings by environment (`settings/base.py`, `settings/dev.py`, `settings/prod.py` importing from base) or read from env vars via `django-environ` — never a single `settings.py` with `DEBUG = True` and a hardcoded `SECRET_KEY` committed to the repo.

## Testing

`pytest-django` over Django's own `TestCase`/`Client` — keeps the test suite on one framework instead of two:

```python
@pytest.mark.django_db
def test_create_order(client: Client, customer: Customer) -> None:
    response = client.post("/orders/", {"customer_id": customer.id})
    assert response.status_code == 201
```

`django_db` mark (or the `db` fixture) opts a test into database access explicitly — a test that doesn't touch the DB shouldn't pay for a transaction wrapper.

## transaction.atomic

Wrap any operation that writes to more than one table as a unit — an order plus its line items, an account debit plus a ledger entry:

```python
with transaction.atomic():
    order = Order.objects.create(...)
    LineItem.objects.bulk_create([...])
```

Nested `atomic()` blocks create savepoints — an inner block's rollback doesn't necessarily roll back the outer one. Know which failure should undo how much before nesting them.
