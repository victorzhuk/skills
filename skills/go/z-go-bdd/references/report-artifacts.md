# Report Artifacts

`.feature` files are the source of truth. Reports are evidence from a run.

## Standard paths

```txt
reports/bdd/pretty.txt
reports/bdd/junit.xml
reports/bdd/cucumber.json
```

Use project-specific paths when they already exist.

## Format roles

| Format | Consumer | Use |
|---|---|---|
| `pretty` | developer | terminal/debug output |
| `junit` | CI | test annotations and pass/fail gates |
| `cucumber` JSON | scripts/docs/agents | dashboards, release evidence, context extraction |

Recommended CI format:

```txt
pretty,junit:reports/bdd/junit.xml,cucumber:reports/bdd/cucumber.json
```

## Gates

Use the test runner exit status as the primary gate. A missing report, empty selection, or undefined/pending/skipped required scenario must not pass merely because no step has status failed. For an all-required passing report, an additional `jq`/`jaq` check is:

```sh
jq -e '[.[].elements[].steps[].result.status] | length > 0 and all(. == "passed")' reports/bdd/cucumber.json
```

Common scripts:

- require all selected `@critical` scenarios to pass; fail on missing/empty evidence
- build living documentation HTML
- sync `@story:*` scenario status to a tracker
- produce release evidence for auth, billing, permissions, and data-loss tags
- diff scenario names/tags between releases

## Final response evidence

```md
Behavior changed:
- `features/billing/payment.feature`: Scenario: Gateway timeout leaves order pending

Validated:
- `BDD_TAGS='@story:PAY-241' timeout 15m go test -parallel 4 -p 2 -timeout 10m ./internal/billing -run '^TestBDD$'`
- report: `reports/bdd/cucumber.json`
```

If the report was not generated, cite the exact command output instead.
