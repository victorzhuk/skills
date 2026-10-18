---
name: z-flutter-core
description: Flutter mobile clients from one Dart codebase for iOS and Android, API-driven — Dart 3 essentials (null safety, records, sealed classes), Riverpod as state default, feature-first layout, typed API clients. Triggers on Flutter, Dart, riverpod, setState. Does not cover backend API contracts; see [[z-go-api-design]].
---

# Flutter core

Build Flutter clients as thin, typed consumers of an API — one Dart codebase per product, business state lives in providers, not widgets.

## Dart 3 essentials

- sound null safety is the default — don't reach for `!` without a documented invariant that makes it safe
- records for lightweight multi-value returns (`(String, int)`), not a throwaway class
- pattern matching / switch expressions over `if`/`else` chains on a type
- sealed classes for closed variant hierarchies (e.g. `Loading`/`Data`/`Error` UI state) — the compiler flags a missing case in an exhaustive `switch`

## State management — Riverpod is house default

- Riverpod is the house default for a new project. Check `pubspec.yaml`, the lockfile, and the installed major's migration guide before choosing APIs; preserve an existing Bloc/Provider design.
- widgets stay dumb: read a provider, render, dispatch an event. Business logic and mutable state live in providers/notifiers, not in `State` objects
- no `BuildContext` threading to reach state — that dependency is what Riverpod removes

## Project layout — feature-first

- Group by feature. Add `data`, `domain`, or `presentation` subdirectories only when existing code needs them; do not scaffold empty layers.
- shared code (theming, the API client, common widgets) lives in `lib/core` or `lib/shared`

## API client discipline

- a generated client or one typed hand-written client — never pass raw `Map<String, dynamic>` through the UI or business layers
- decode at the boundary once; everything past it sees typed models

## Theming

- Material 3 via `ColorScheme.fromSeed` — hardcoded colors scattered through widgets are a theming bug waiting to surface

## Testing

- running-app acceptance (integration test on a device or emulator) proves required user journeys — the default tier; state native-UI limitations of the runner when choosing it
- widget tests only for named residual risks acceptance cannot prove economically
- golden tests only for visually sensitive screens (design system, brand surfaces) — expensive to maintain, a per-screen judgment call, not blanket policy

## Platform channels

- only after confirming no maintained plugin covers the gap (checked pub.dev) — a `MethodChannel` is host-specific code the team now owns forever

## Do not

- drive app architecture from `setState` — fine for a single widget's own ephemeral UI state (an expand/collapse toggle), wrong the moment another widget needs to read it
- put business logic in `build()` — it re-runs on every rebuild; side effects and computation belong in providers
- block the main isolate — long CPU work (parsing a huge JSON payload, image processing) goes through `compute()` or a separate isolate

## Verify

- `dart format --set-exit-if-changed .`
- `flutter analyze`
- Existing bounded test wrapper first; otherwise use the installed runner's timeout and concurrency options inside a whole-process deadline. See [[z-testing-strategy]].
