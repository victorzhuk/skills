---
name: z-ts-core
description: Strict-mode TypeScript house conventions for a Go-first engineer's TS side — tsconfig baseline, zod boundary validation, Error-subclass error handling, and Biome/vitest/pnpm tooling defaults for small tools and minimal frontends. Use when writing or reviewing TypeScript, choosing tsconfig flags, deciding how to validate external data (API responses, env vars, Telegram initData), picking Biome vs ESLint or zod vs valibot, or setting up a new TS package. Triggers on "tsconfig", "strict mode", "zod schema", "discriminated union", "satisfies", "biome", "vitest", "tsx script". Does not cover Telegram Mini App specifics (initData HMAC, theme params, viewport); see [[z-ts-telegram-mini-app]]. Does not cover naming/error-message register; see [[z-no-ai-style-code]]. Does not cover abstraction restraint; see [[z-no-over-engineering]]. Does not cover test-depth classification; see [[z-testing-strategy]].
---

# TypeScript core

House defaults for this catalog's TS side: Telegram Mini Apps, small CLI tools, minimal frontends. Not universal law — swap any row below when a project's own convention says otherwise.

## tsconfig baseline

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
| `verbatimModuleSyntax` | forces `import type`/`export type` on type-only imports; the emitted JS mirrors the source 1:1, so a bundler never has to guess whether an import is a value or erasable |
| `module: "preserve"` | (5.4+) keeps each import/export in the form you wrote it — stops TS emitting a module format your bundler doesn't produce |
| `moduleResolution: "bundler"` | matches how Vite/esbuild actually resolve: package.json `exports`/`imports`, no forced file extensions on relative imports |
| `isolatedModules` | every file must transpile standalone — required by esbuild/swc single-file transforms, catches `const enum` and other whole-program features early |
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
- Discriminated unions over enums or boolean flags. A `kind`/`type` literal field plus an exhaustive `switch` gives you a compiler error the moment a new case appears — an `enum` or two booleans don't.

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
| Framework plugins | none | `eslint-plugin-react`, `eslint-config-next`, etc. |

Default: Biome for new or small TypeScript — Mini Apps, scripts, tools. One fast tool covers formatting and the common lint rules with zero config. Reach for ESLint + `typescript-eslint` when a framework mandates its own plugin (Next.js) or a specific type-aware rule Biome's scanner doesn't cover yet is the one blocking a real bug class.

Tests: vitest. Table-driven cases via `test.each`, not a copy-pasted `it` per row:

```ts
test.each([
  [1, 1, 2],
  [2, 3, 5],
])('add(%i, %i) -> %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected)
})
```

No dedicated TS testing skill yet in this catalog — [[z-testing-strategy]] covers depth and when a change needs a contract test, not vitest syntax.

Scripts: `tsx` (esbuild-backed — watch mode, tsconfig path aliases, zero config). Node's built-in type stripping (default since Node 22.18, no flag) covers a throwaway script with only erasable syntax, but drops `enum`, parameter properties, namespaces with runtime code, and import aliases — reach for `tsx` the moment a script needs any of those, or wants watch mode.

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
vitest run
```

Confirm the boundary schema and its inferred type are the only source of truth for that shape — `grep -rn "interface Profile" src` next to a `profileSchema` should turn up nothing.
