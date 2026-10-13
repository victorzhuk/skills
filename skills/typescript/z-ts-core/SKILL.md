---
name: z-ts-core
description: Strict-mode TypeScript house conventions for a Go-first engineer — tsconfig baseline, zod boundary validation, Error-subclass handling, and Biome/vitest/pnpm defaults. Use when writing TypeScript or picking Biome vs ESLint or zod vs valibot. Triggers on "tsconfig", "strict mode", "zod schema", "satisfies", "biome", "vitest". Does not cover Mini App specifics, naming, or test-depth; see [[z-ts-telegram-mini-app]], [[z-no-ai-style-code]], [[z-testing-strategy]].
---

# TypeScript core

House defaults for this catalog's TS side: Telegram Mini Apps, small CLI tools, minimal frontends. Not universal law — swap any row below when a project's own convention says otherwise.

## tsconfig baseline

Choose the execution host first. This example is for bundled browser code. For JavaScript emitted by TypeScript and executed directly by Node, use `module` and `moduleResolution` set to `NodeNext`, match the runtime target, and use runtime-valid relative import extensions. Omit `DOM` from Node-only libraries. Direct TypeScript execution has separate restrictions; verify the actual launcher and installed versions.

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "module": "preserve",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

| Flag | Why it earns its line |
|---|---|
| `strict` | baseline: null checks, no implicit `any`, strict `bind`/`call`/`apply` — table stakes, not a bonus |
| `noUncheckedIndexedAccess` | `arr[i]` and `record[key]` type as `T \| undefined` — `strict` alone doesn't catch this; it's the single highest-value flag `strict` omits |
| `exactOptionalPropertyTypes` | `{ a?: string }` stops accepting an explicit `undefined` — separates "key absent" from "key set to undefined", which `?:` alone conflates |
| `verbatimModuleSyntax` | preserve value imports/exports and erase those marked `type`; use explicit type-only imports where required |
| `module: "preserve"` | (5.4+) keeps each import/export in the form you wrote it — stops TS emitting a module format your bundler doesn't produce |
| `moduleResolution: "bundler"` | matches how Vite/esbuild actually resolve: package.json `exports`/`imports`, no forced file extensions on relative imports |
| `isolatedModules` | catch constructs that cannot be safely transformed one file at a time, including references to ambient const enums |
| `skipLibCheck` | skip type-checking vendored `.d.ts` — not laziness, a broken third-party type isn't your bug to fix |

## ESM only

New packages: `"type": "module"` in `package.json`, no `require()`, no `module.exports`. Reach for CommonJS interop only when a dependency ships CJS-only — let the bundler's interop handle it, don't hand-roll a shim.

## Runtime boundary validation

Parse, don't cast. Never `as SomeType` on data that crossed a boundary — API responses, `process.env`, Telegram `initData`, `JSON.parse` output. Define a schema, validate at the boundary, infer the static type from the schema so the two never drift:

```ts
const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  balanceCents: z.number().int(),
})
type Profile = z.infer<typeof profileSchema>

const profile = profileSchema.parse(await response.json())
```

| Library | Default when | Reach for when |
|---|---|---|
| zod | most tools, backends, anything hitting tRPC/React Hook Form | — |
| valibot | — | bundle size is the actual constraint: a Mini App webview's initial load, an edge function. Its modular, tree-shakeable pipe API ships a fraction of zod's bytes for the same schema |

Zod stays the default: broadest ecosystem (tRPC, `@hookform/resolvers`, Standard Schema-compliant libraries) and the safer choice when nobody has measured a bundle problem yet. Don't reach for valibot "for the bytes" without a real budget it's blowing.

## Error handling

- Throw `Error` subclasses, never a string or a plain object — `throw 'not found'` loses the stack trace and `instanceof` narrowing.
- Attach `cause` when wrapping a lower-level failure: `throw new FetchProfileError('fetch profile', { cause: err })`. Don't flatten the original error into a string.
- One `Error` subclass with a `code` field is usually enough to let call sites branch (`if (err.code === 'not_found')`). Build an exception hierarchy only once a second concrete case needs `instanceof` to tell them apart — see [[z-no-over-engineering]].
- Reach for a discriminated-union result type only where a function's failure is a **domain outcome the caller must branch on**, not a bug — a declined Telegram payment, a validation failure the UI renders inline. A malformed response, a network error, a programmer mistake: throw. Don't wrap every fallible function in `Result<T, E>` "for consistency" — that's Rust's `Result` habit misapplied where exceptions already are the control flow.

```ts
type SubmitResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: 'declined' | 'insufficient_stars' }
```

## Type discipline

- `unknown` over `any` at every boundary — `catch (err: unknown)`, `JSON.parse` results, webhook payloads. Narrow before use; `any` silently opts the whole expression back out of checking.
- Prefer discriminated unions for variants carrying different data. Enforce exhaustiveness with a `never` check; enums can also be checked exhaustively. Avoid unrelated booleans that permit invalid state combinations.

```ts
function assertNever(x: never): never {
  throw new Error(`unhandled case: ${JSON.stringify(x)}`)
}
```

- `satisfies` for config/literal objects — checks the shape against a type while keeping the narrowed literal types for autocomplete and exhaustiveness, unlike an `: AppConfig` annotation which widens.

```ts
const config = {
  timeout: 5000,
  retries: 3,
} satisfies AppConfig
```

- No premature generics. A function called from one site doesn't need `<T>` — add it when a second concrete type shows up, not for "future flexibility". See [[z-no-over-engineering]].

## Tooling

| | Biome | ESLint + Prettier |
|---|---|---|
| Setup | one binary, one config file | two tools, two configs, plugin wiring |
| Speed | Rust, single process | spins up the TS type-checking service separately for type-aware rules |
| Type-aware lint | v2's opt-in "project domain" scanner — real but partial (e.g. `noFloatingPromises` catches most, not all, cases `typescript-eslint` catches) | full `typescript-eslint` parity |
| Framework rules | built-in framework domains; check the installed version and enabled domains | framework plugins such as `eslint-plugin-react` and `eslint-config-next` |

Preserve the project's configured tools. Biome is the house default for a new small package; choose ESLint with `typescript-eslint` when required rules or framework integration need it. Next.js does not universally require ESLint. Compare required rules against the installed versions rather than assuming feature parity.

Tests: vitest. Table-driven cases via `test.each`, not a copy-pasted `it` per row:

```ts
test.each([
  [1, 1, 2],
  [2, 3, 5],
])('add(%i, %i) -> %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected)
})
```

Use the existing bounded test wrapper. Set `maxWorkers` and `testTimeout` in the Vitest configuration and give the whole command a deadline; [[z-testing-strategy]] defines the floor.

No dedicated TS testing skill yet in this catalog — [[z-testing-strategy]] covers depth and when a change needs a contract test, not vitest syntax.

Scripts: preserve the existing launcher. Node's type stripping supports erasable syntax but rejects syntax requiring transformation, including enums and parameter properties, unless a supported transformation mode is explicitly enabled. It does not apply `tsconfig` path aliases. Check the installed Node version; use `tsx` when its transformation or resolution behavior is needed.

Package manager: match whatever lockfile is already in the repo (`pnpm-lock.yaml` → pnpm, `package-lock.json` → npm, `yarn.lock` → yarn) — never switch an existing project. `pnpm` is the default for a brand-new package: strict dependency resolution catches phantom imports `npm`'s flat `node_modules` hides, and monorepo/workspace support is the best of the three.

## Do not

- Write an `interface` by hand next to a zod schema for the same shape — infer it with `z.infer`, or the two drift the first time either changes.
- Cast with `as` to silence a type error on boundary data instead of validating it — that's exactly the bug `unknown` + a schema exists to prevent.
- Reach for `Result<T, E>` on a function whose only failure mode is "the network is down" or "the input was malformed" — those are exceptions, not domain outcomes.
- Turn on Biome's type-aware rules or add `typescript-eslint` "just in case" before a rule from either has actually caught something the other tool missed.
- Add a generic type parameter to a function with one call site because it "might be reused" — see [[z-no-over-engineering]].
- Ship CommonJS in a new package because one old snippet used `require()` — fix the import, don't flip `module`/`type` back for it.

## Verify

```sh
tsc --noEmit                 # strict flags actually catch what they claim to
npx biome check .            # or `eslint . && prettier --check .` if that's the project's choice
timeout 5m vitest run --maxWorkers=50% --testTimeout=5000
```

Confirm the boundary schema and its inferred type are the only source of truth for that shape — `grep -rn "interface Profile" src` next to a `profileSchema` should turn up nothing.
