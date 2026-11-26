---
name: z-go-env-v11
description: "Parse environment configuration with caarlos0/env v11. Use for struct tags, missing or empty values, custom parsers, isolated tests, and .env.example checks."
---

# caarlos0/env v11

Parse environment values into a configuration struct. Check business constraints and enum membership separately.

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

Pass a map in `env.Options.Environment` for isolated tests. Keep key presence separate from the empty string. Use the library to resolve nested fields and prefixes.

```go
func loadConfig(values map[string]string) (Config, error) {
    return env.ParseAsWithOptions[Config](env.Options{Environment: values})
}
```

Use a non-nil map for isolated tests. Include an empty map to exercise missing variables without reading the process environment.

## Missing and empty values

The parser distinguishes a missing key from a present empty string.

| Environment state    | `,required` (no `envDefault`) | `,required` + nonempty `envDefault` | `,notEmpty` |
|----------------------|-------------------------------|--------------------------------------|--------------|
| key absent           | error                         | passes (default applied)             | error        |
| key present, `""`    | **passes**                    | passes (default applied)             | error        |
| key present, value   | passes                        | passes                               | passes       |

The parser applies `envDefault` before checking `required` or `notEmpty`. A nonempty default can satisfy either constraint.

Use `notEmpty` without a secret default when the operator must supply a nonempty value. Test missing, empty, and populated inputs separately.

## Struct tags

- `env:"NAME"` names the variable. Add supported options after a comma.
- `envDefault:"v"` — value when the key is absent (or present-empty).
- `envSeparator:";"` — slice item separator. Default is `,` — **omit it for comma**.
- `envKeyValSeparator:"="` — map key/value separator. Default is `:`.
- `envPrefix:"DB_"` — on a nested struct field, prefixes all its keys.

Use `required` for presence and `notEmpty` for a nonempty value. Match defaults to the contract above.

Use `expand` for variable expansion, `file` for file contents, `init` for nil pointers, and `unset` to clear a variable after reading.

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

- Use `RequiredIfNoDef` only when every field without a default needs a value. Check conditional requirements after parsing.
- `Prefix` — global prefix for all keys. `OnSet` — hook per set value. `TagName` /
  `DefaultValueTagName` / `PrefixTagName` — rename the tags. `UseFieldNameByDefault` — derive
  the key from the field name when `env:""` is missing.

## Validation is separate

Check ranges, relationships, provider settings, and allowed values after parsing.
Parse constrained values as a string alias (`type AuthMode string`) and check membership in a
`Validate()` pass that runs after `Parse`. Thread `getenv` into `Validate` if it needs to read
flags not represented as struct fields.

Call `cfg.Validate()` before binding any listener: on error, `run` returns it and `main` exits
non-zero without opening ports.

## .env.example mirror

Every `env:"NAME"` key in the config struct MUST appear in a committed `.env.example` as
`NAME=<safe-default-or-empty>`, each with a `# required` or `# optional` comment. Secrets
(`DATABASE_URL` and friends) get an empty value plus `# required` — never a real secret.
Ignore `.env` in Git. Commit the example template.

Read the expected keys with the library.

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

Make the helper fail on extraction errors or missing keys. Skip fields with `Ignored == true`. Supply the production `Options.Environment` to discover slice element keys that depend on the environment.

## direnv auto-inject

Use this directive when the project uses direnv.

```sh
dotenv
```

Keep secrets out of `.envrc`. Supply CI variables through the CI environment. For a Makefile fallback, see [[z-go-makefile]].

## Do not

- Call `os.Getenv` outside the config package — route everything through the `getenv` seam.
- Rely on `,required` alone to reject an empty secret — use `,notEmpty`.
- Write `envSeparator:","` — comma is the default.
- Use `RequiredIfNoDef` when any key may be intentionally empty.
- Put enum membership or range checks in tags — they belong in `Validate()`.

## Checks

```sh
go build ./... && timeout 5m go test -parallel 4 -p 2 -short -timeout 2m ./internal/config/...
```
