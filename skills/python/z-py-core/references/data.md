# Data and LLM clients

## polars-first for new pipelines

Default to polars for a new pipeline; reach for pandas only where the ecosystem forces it (a library that only accepts a `pandas.DataFrame`).

Lazy frames and expressions, not row-wise `apply`:

```python
result = (
    pl.scan_csv("orders.csv")
    .filter(pl.col("status") == "paid")
    .group_by("customer_id")
    .agg(pl.col("amount").sum().alias("total"))
    .collect()
)
```

`.scan_csv`/`.lazy()` builds a query plan; polars optimizes and pushes down filters before touching disk. `.collect()` at the end, once — collecting mid-pipeline throws away the optimizer's ability to fuse later steps.

Interop at the boundary, not throughout: `.to_pandas()` right where a downstream library needs a `DataFrame`, not as the working representation for the whole pipeline.

## Notebook discipline

Notebooks explore; modules ship. A cell that gets rerun more than once, or that another cell depends on, is a function that belongs in `src/` — copy it out, add a type signature, write one test. Nothing production imports a `.ipynb` directly; if a pipeline needs the logic, the logic already left the notebook.

Keep exploratory notebooks out of the package's import path entirely (a top-level `notebooks/` directory, not `src/pkg/notebooks/`) so nothing accidentally depends on unstable, unreviewed code.

## Validation at ingestion

Validate where data enters, not scattered through every transform downstream. For record-shaped ingestion (a row, an API payload, a queue message), a pydantic model per record:

```python
class OrderRecord(BaseModel):
    order_id: int
    amount: float = Field(ge=0)
    status: Literal["pending", "paid", "refunded"]
```

For DataFrame-level validation (column presence, dtypes, value ranges across a whole batch), a schema library at concept level — polars' own schema checks, or `pandera` for pandas — catches a malformed batch before it reaches the rest of the pipeline instead of surfacing as a `KeyError` three transforms later.

## LLM SDK usage

A thin typed wrapper around the SDK, not raw client calls scattered through the codebase:

```python
class ChatClient:
    def __init__(self, client: AsyncOpenAI, timeout: float = 30.0) -> None:
        self._client = client
        self._timeout = timeout

    async def complete(self, prompt: str) -> str:
        response = await self._client.chat.completions.create(
            model="...",
            messages=[{"role": "user", "content": prompt}],
            timeout=self._timeout,
        )
        return response.choices[0].message.content or ""
```

Choose one retry owner. Check the installed SDK's default retry behavior before adding an outer policy, so nested retries do not multiply attempts. Set a total request deadline and retry only documented transient failures with bounded backoff; account for cancellation and duplicate side effects. A broad retry decorator would also retry validation and bad-request errors.

Never string-concatenate a prompt with untrusted input (user-submitted text, scraped content, a webhook payload) without treating it as an injection surface — state explicitly in the code or its caller that the input is untrusted, and don't let it carry instructions the model would follow as if they came from the system or developer. See [[z-security-hardening]] for the general untrusted-input discipline this is a specific case of.
