# Tag Taxonomy

Tags make behavior contracts filterable by CI, release scripts, reports, and humans.

## Required tag types

| Type | Format | Example |
|---|---|---|
| Domain | `@<domain>` | `@billing`, `@auth`, `@orders` |
| Risk | `@critical`, `@high`, `@medium`, `@low` | `@critical` |
| Work item | `@story:<ID>` or project equivalent | `@story:PAY-241` |
| Test type | `@type:<type>` | `@type:integration` |

Use the project tracker name when known: `@linear:ABC-123`, `@jira:PAY-241`, `@github:#184`.

## Optional tags

| Purpose | Format | Example |
|---|---|---|
| Component | `@component:<name>` | `@component:gateway` |
| Boundary | `@boundary:<name>` | `@boundary:postgres` |
| Release gate | `@release` | `@release` |
| Work in progress | `@wip` | `@wip` |
| Slow tests | `@slow` | `@slow` |

## Filters

```sh
BDD_TAGS='@billing && ~@wip' go test ./... -run '^TestBDD$'
BDD_TAGS='@critical && @type:integration' go test ./... -run '^TestBDD$'
BDD_TAGS='@story:PAY-241' go test ./... -run '^TestBDD$'
```

## Rules

- Do not use tags for implementation details: `@sqlc`, `@gorm`, `@handler`.
- Do not create synonyms for the same domain.
- Remove `@wip` before merge unless CI excludes it intentionally.
- Keep risk tags stable; do not downgrade risk to make CI faster.
- Prefer one domain tag per scenario unless the scenario truly crosses domains.
