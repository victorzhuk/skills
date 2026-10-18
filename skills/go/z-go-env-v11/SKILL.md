---
name: z-go-env-v11
description: Parse environment configuration in Go with caarlos0/env v11 — generics, env.Options, struct tags, custom parsers, and injecting a custom env source for hermetic tests. Use when adding env-driven config, choosing required vs notEmpty, injecting env.Options.Environment, or parsing durations/slices/enums. Triggers on "caarlos0/env", "env.Parse", "ParseAsWithOptions", "envDefault", "env tag", "config from env", "notEmpty".
---

# caarlos0/env v11

Bind environment variables to a config struct. `env/v11` does parsing and presence
checks; keep business rules and enum membership in a separate `Validate()`.

## Parse entry points

Prefer the generic forms — they return the value, no pre-zeroed pointer:

```go
cfg, err := env.ParseAs[Config]()                       // from os.Environ()
cfg, err := env.ParseAsWithOptions[Config](env.Options{ // custom source/options
    Environment: m,
})
cfg := env.Must(env.ParseAs[Config]())                  // panic on error (main only)
```

Pointer forms `env.Parse(&cfg)` / `env.ParseWithOptions(&cfg, opts)` exist for when you
already hold a struct (e.g. partially pre-filled).

## Inject a custom source (the test seam)

Pass `env.Options{Environment: map[string]string}` to replace `os.Environ()` in tests. Preserve key presence separately from its string value; do not enumerate struct tags with a custom reflection walker, which can miss prefixes, pointer fields, and library options.

```go
func loadConfig(values map[string]string) (Config, error) {
    return env.ParseAsWithOptions[Config](env.Options{Environment: values})
}
```

Use a non-nil map for hermetic tests, including an empty one. At the composition root, either use normal `env.ParseAs` or supply a complete environment map. Preserve an existing approved lookup seam, but translate it without losing prefix or presence semantics.

## Empty vs unset (the load-bearing gotcha)

env decides "set" by map comma-ok (`value, ok := environment[key]`), so a key present
with value `""` is **SET**, not unset:

| Environment state    | `,required` (no `envDefault`) | `,required` + nonempty `envDefault` | `,notEmpty` |
|----------------------|-------------------------------|--------------------------------------|--------------|
| key absent           | error                         | passes (default applied)             | error        |
| key present, `""`    | **passes**                    | passes (default applied)             | error        |
| key present, value   | passes                        | passes                               | passes       |

`envDefault` is applied before the `required` and `notEmpty` checks, so `required` with a
nonempty `envDefault` does not fail when the key is absent; `notEmpty` then inspects the
defaulted value. Consequence: `,required` alone does **not** reject an empty secret. To
require non-empty, use `,notEmpty`. Do not put a secret in `envDefault` when explicit
operator input is required. Keep explicit empty values in injected maps so tests exercise
the same semantics as production.

## Struct tags

- `env:"NAME"` — variable name; first comma-flag list follows.
- `envDefault:"v"` — value when the key is absent (or present-empty).
- `envSeparator:";"` — slice item separator. Default is `,` — **omit it for comma**.
- `envKeyValSeparator:"="` — map key/value separator. Default is `:`.
- `envPrefix:"DB_"` — on a nested struct field, prefixes all its keys.

Comma flags inside `env:"…"`: `required` (must be set), `notEmpty` (set and non-empty),
`expand` (`$VAR`/`${VAR}` expansion), `file` (value is a path; read the file's contents),
`init` (allocate nil pointers), `unset` (clear the var after reading).

## Types

Native: `string`, `bool`, ints, `float64`, `time.Duration` ("5m"), `time.Location`,
`url.URL`, `[]T` (via `envSeparator`), `map[K]V` (via `envKeyValSeparator`), pointers
(`,init`), and any `encoding.TextUnmarshaler`. For domain types you own, implement
`TextUnmarshaler` rather than a parser — it travels with the type.

## Custom parsers

For types you can't add methods to, register a `FuncMap`:

```go
env.ParseAsWithOptions[Config](env.Options{
    FuncMap: map[reflect.Type]env.ParserFunc{
        reflect.TypeOf(uuid.UUID{}): func(v string) (any, error) { return uuid.Parse(v) },
    },
})
```

## Other options

- `RequiredIfNoDef: true` — make every field without a default required. **Do not** use it
  when some keys are legitimately optional (e.g. keyless local providers); keep those
  tag-light and validate conditionally instead.
- `Prefix` — global prefix for all keys. `OnSet` — hook per set value. `TagName` /
  `DefaultValueTagName` / `PrefixTagName` — rename the tags. `UseFieldNameByDefault` — derive
  the key from the field name when `env:""` is missing.

## Validation is separate

env parses; it does not enforce ranges, cross-field rules, provider switches, or enum sets.
Parse constrained values as a string alias (`type AuthMode string`) and check membership in a
`Validate()` pass that runs after `Parse`. Thread `getenv` into `Validate` if it needs to read
flags not represented as struct fields.

Call `cfg.Validate()` before binding any listener: on error, `run` returns it and `main` exits
non-zero without opening ports.

## .env.example mirror

Every `env:"NAME"` key in the config struct MUST appear in a committed `.env.example` as
`NAME=<safe-default-or-empty>`, each with a `# required` or `# optional` comment. Secrets
(`DATABASE_URL` and friends) get an empty value plus `# required` — never a real secret.
`.env` itself stays gitignored; `.env.example` is the committed template.

Verify seam — one Go helper owns it:

```go
params, err := env.GetFieldParamsWithOptions(&Config{}, env.Options{ /* production Options */ })
if err != nil {
    os.Exit(1) // extraction error fails the check
}
var keys []string
for _, p := range params {
    if p.Ignored {
        continue // `env:"-"` fields are still returned; skip them
    }
    keys = append(keys, p.Key)
}
sort.Strings(keys)
// diff keys against the `^[A-Z0-9_]*=` keys of .env.example,
// print every missing key, exit nonzero on any
```

The helper must exit nonzero on an extraction error and on any missing key; `comm`-style
empty output alone is not the gate. Caveats: `env:"-"` fields come back with
`Ignored == true` and must be skipped; slice-of-struct element keys are discovered only
when the production `Options.Environment` is supplied — without it they are out of scope
for this check.

## direnv auto-inject

Commit a `.envrc` containing exactly one line:

```sh
dotenv
```

No `layout go`, no secrets. Local runs pick up `.env` automatically; CI ignores `.envrc` and
uses real env. The `[[z-go-makefile]]` `-include .env` seam is the non-direnv fallback, not
the default.

## Do not

- Call `os.Getenv` outside the config package — route everything through the `getenv` seam.
- Rely on `,required` alone to reject an empty secret — use `,notEmpty`.
- Write `envSeparator:","` — comma is the default.
- Use `RequiredIfNoDef` when any key may be intentionally empty.
- Put enum membership or range checks in tags — they belong in `Validate()`.

## Verify

```sh
go build ./... && timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./internal/config/...
```
