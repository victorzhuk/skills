---
name: z-ts-core
description: "Configure strict TypeScript and parse external data at runtime. Use for tsconfig, ESM, Zod, Valibot, Biome, ESLint, or Vitest. See [[z-ts-telegram-mini-app]] for Telegram clients and [[z-testing-strategy]] for test depth."
---

# TypeScript

## Match the compiler to the runtime

Read `package.json`, the lockfile, the build scripts, and the effective `tsconfig`. Use the project's package manager and module format. For a new package, prefer ESM and pnpm when consumers support them.

This configuration targets a browser bundler. For JavaScript that Node loads directly, use compatible Node module and resolution settings. Include DOM types only for environments that provide them.

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

- Enable `strict`. Use `noUncheckedIndexedAccess` for missing entries and `exactOptionalPropertyTypes` to distinguish absent properties from explicit `undefined`.
- Use `verbatimModuleSyntax` and explicit type imports. Use `isolatedModules` with single-file transpilers.
- Use `module: "preserve"` only with a compatible TypeScript version and build tool. Check the output import paths in the target runtime.
- `skipLibCheck` skips declaration-file checking. Inspect dependency conflicts when their declarations disagree.
- Node's native type stripping requires compatible syntax, imports, and Node versions. It does not resolve `tsconfig` path aliases. Preserve the project's script runner.

## Parse inputs and represent failures

Treat API responses, environment variables, and decoded JSON as `unknown`. Parse boundary data with the project's schema. Infer its static type from the schema. A type assertion cannot reject malformed input at runtime.

```ts
const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  balanceCents: z.number().int(),
})
type Profile = z.infer<typeof profileSchema>

const profile = profileSchema.parse(await response.json())
```

Use Zod when its integrations fit the project. Consider Valibot when a measured bundle budget requires an alternative. Compare the installed versions and the schemas the application ships.

Throw an `Error` for unexpected failures. Preserve the original error with `cause` when adding context. Use a discriminated union for domain results the caller must handle.

```ts
type SubmitResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: 'declined' | 'insufficient_stars' }
```

Narrow variants before using their fields. Use a `never` check in an exhaustive branch.

```ts
function assertNever(x: never): never {
  throw new Error(`unhandled case: ${JSON.stringify(x)}`)
}
```

Use `satisfies` to check an object against its contract while retaining the expression's inferred type. Add a generic when a relationship between types needs it. See [[z-no-over-engineering]] and [[z-no-ai-style-code]].

```ts
const config = {
  timeout: 5000,
  retries: 3,
} satisfies AppConfig
```

## Check the toolchain

Use the existing formatter and linter. For a new small project, consider Biome. Use ESLint and `typescript-eslint` when the project needs their rules or integrations. Compare specific rules in the installed tools.

Use table-driven Vitest cases for inputs that share one contract.

```ts
test.each([
  [1, 1, 2],
  [2, 3, 5],
])('add(%i, %i) -> %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected)
})
```

```sh
tsc --noEmit                 # strict flags actually catch what they claim to
biome check .                # when the project uses Biome
timeout 5m vitest run --maxWorkers=50% --testTimeout=5000
```

Use the project scripts or installed binaries. Set a process deadline, a worker cap, and a per-test timeout. Test invalid boundary input as well as accepted input. Exercise module resolution with the production build or launcher.
