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

One call site for retries and timeouts — an SDK's own defaults are rarely the right ones for a production call path, and a shared wrapper is where a retry-with-backoff policy actually gets enforced instead of copy-pasted per call site:

```python
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def complete(self, prompt: str) -> str:
    ...
```

Retry on the transient failures the SDK actually raises (rate limit, timeout, transient 5xx) — not on every exception; a validation error or a bad-request response won't succeed on a second try and shouldn't burn the retry budget.

Never string-concatenate a prompt with untrusted input (user-submitted text, scraped content, a webhook payload) without treating it as an injection surface — state explicitly in the code or its caller that the input is untrusted, and don't let it carry instructions the model would follow as if they came from the system or developer. See [[z-security-hardening]] for the general untrusted-input discipline this is a specific case of.
