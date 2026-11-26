---
name: z-flutter-core
description: "Build Flutter clients with Dart, typed API models, and widget state. Use for Riverpod, feature layout, themes, platform channels, or device tests. See [[z-qa-android]] for device control."
---

# Flutter mobile clients

## Select representations

- Check the Dart SDK constraints before using records, patterns, or sealed classes.
- Use a record such as `(String, int)` for a small multi-value return.
- Model closed UI states such as loading, data, and error with a sealed hierarchy. Handle each state in the switch.
- Use a null assertion only when the code establishes the invariant.
- Decode API payloads once. Pass typed models to the UI. See [[z-go-api-design]] for backend contracts.

## Organize state and views

Read `pubspec.yaml` and the lockfile. Preserve the project's state-management library.
Riverpod is the default for a new project. Select APIs from the installed major version.
Keep shared business state in a provider or notifier. Keep local controls such as expansion state in the widget when appropriate.
Render in `build()`. Dispatch events outside rendering. Avoid retaining `BuildContext` for state access.

Group files by feature. Add `data`, `domain`, or `presentation` directories when their contents require them.
Place shared themes, widgets, and clients in the project's shared directory.
Use theme colors, such as Material 3's `ColorScheme.fromSeed`. Check contrast in each supported theme.

## Connect to the platform

Check maintained plugins before adding a `MethodChannel`. Implement and test each supported native side.
Keep expensive CPU work off the mobile UI isolate. Measure before choosing `compute()` or a dedicated isolate.

## Check the app

1. Check formatting without editing files with `dart format --output=none --set-exit-if-changed .`.
2. Run `flutter analyze`.
3. Exercise required journeys on a device or emulator. Record any native UI the runner cannot exercise.
4. Add widget tests for specific uncovered behavior. Use golden tests for visual contracts.
5. Use a bounded test wrapper. See [[z-testing-strategy]] and [[z-qa-android]].
