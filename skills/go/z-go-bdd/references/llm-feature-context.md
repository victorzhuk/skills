# Feature Files as Agent Context

Feature files are compact domain context. They describe supported behavior without exposing implementation noise.

## Loading strategy

Chunk by feature or scenario, not by arbitrary token count.

Metadata to keep with each chunk:

- file path
- feature name
- scenario name
- tags
- line range when available

Example chunk key:

```txt
features/billing/payment.feature#Gateway timeout leaves order pending
```

## Prompt use

Use feature files to answer:

- what behavior the service supports
- what acceptance criteria already exist
- which scenarios a code change may affect
- which tags matter for targeted validation
- what regression test should be added for a bug

## Generation loop

1. Draft or update Gherkin from the requested behavior.
2. Ask for confirmation when business language is ambiguous.
3. Generate or edit step stubs.
4. Fill steps by calling application/use-case/test-helper code.
5. Run red/green validation.

Generated text is not accepted until an executable scenario passes.

## Guardrails

- Do not invent feature behavior not present in the user request, issue, code, or existing feature files.
- Do not treat Cucumber JSON as the source of truth; it is a run artifact.
- Do not let generated step code contain business logic that should live in production code.
- Do not use `.feature` files as a dumping ground for implementation notes.
