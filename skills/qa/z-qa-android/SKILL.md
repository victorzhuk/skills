---
name: z-qa-android
description: "Test Android apps with adb, a headless emulator, or a physical device. Use for APK smoke tests, scripted interactions, and exact screenshot comparison. See [[z-qa-browser]] for browser flows."
---

# Android device QA

Run the app on an approved Android emulator or physical test device. Verify user-visible outcomes against [[z-bdd]].

## Select the target

- Read the app's build and test wrappers. Discover the APK or split APK set, package, launch component, and fixture setup.
- Run `adb devices -l`. Select one approved serial in state `device`. Treat absent, offline, and unauthorized targets as unavailable.
- Pass `adb -s "$SERIAL"` to every device command. Set the project's device selector for higher-level runners too.
- Use a physical test device for hardware-dependent behavior. Use a dedicated emulator profile for repeatable CI and screenshot baselines.

## Run a headless emulator

1. Run `emulator -list-avds` and `emulator -accel-check`. Use an existing test AVD or the project's provisioning wrapper. If KVM is unavailable, see [Linux KVM diagnosis](#diagnose-linux-kvm).
2. Reserve an unused even console port and its adjacent ADB port. Verify the supported range with `emulator -help-port`. Give each parallel worker its own AVD and port pair.
3. Run the emulator in a dedicated foreground process or under the CI job's process supervisor:

   ```sh
   emulator -avd "$AVD" -port "$PORT" -no-window -no-audio -no-snapshot
   ```

   Capture emulator stderr and stdout. Verify any GPU override with the installed emulator help and reuse the same renderer for baselines.
4. In the test process, set `SERIAL="emulator-$PORT"`. Run the bundled readiness command from the skill directory:

   ```sh
   python3 scripts/android_device.py --serial "$SERIAL" wait --seconds 120
   ```

5. Verify the owned emulator process still runs. Run `adb -s "$SERIAL" emu avd name` and compare the name with the selected AVD. Before launch, verify package-manager readiness and access past the lock screen.
6. Stop the owned foreground process or let the supervisor stop it on success, failure, or interruption. Verify process exit and device removal. Use a disposable AVD or the project's fixture reset for clean state. `-no-snapshot` disables snapshot load and save but preserves writable device data.

### Diagnose Linux KVM

Inspect KVM from the session that will launch the emulator.

```sh
stat /dev/kvm
id
emulator -accel-check
```

If the restricted session cannot see `/dev/kvm`, run the same commands in an authorized host session. CPU flags and loaded modules alone do not prove device access.

- If KVM works on the host, run the emulator in the authorized host session. Run ADB where it can reach the same ADB server.
- If the host sees the device but cannot use it, inspect device permissions and the launch user's effective groups.
- If the host also lacks the device, verify virtualization support and KVM module state. On a VM, verify nested virtualization when required.

Identify which environment fails before changing host settings. See the [Android Emulator acceleration guide](https://developer.android.com/studio/run/emulator-acceleration).

### Smoke test the headless flow

Use a dedicated AVD and a fresh artifact directory. The live run used an English Android 11 x86_64 AVD at 1080 × 2400. It used `-gpu swiftshader_indirect`. Verify this mode with the installed emulator help before use.

1. Follow the headless boot steps. Verify `adb -s "$SERIAL" shell pm path com.android.settings` returns a package path.
2. Wake the display with `adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP`. On an AVD without a secure lock, use `adb -s "$SERIAL" shell wm dismiss-keyguard`.
3. Open Settings with `adb -s "$SERIAL" shell am start -W -a android.settings.SETTINGS`. Dump the hierarchy as shown below. Find the Display row in `com.android.settings`. Calculate the center of its observed bounds.
4. Capture `before.png` with `android_device.py`. Tap the observed center. Wait until the expected display setting appears or the deadline expires. Use the label from the selected image and locale.
5. Capture `after.png` and `after-repeat.png` after the screen settles. Compare before and after. Expect exit `1` and a diff mask. Compare the two settled captures. Expect exit `0` and zero changed pixels.
6. Keep the screenshots and diff mask. Stop the owned emulator and verify its serial disappears.

## Control and test the app

Use the project runner for maintained scenarios. Prefer semantic selectors and state-based waits in the existing instrumentation, UI Automator, Espresso, or other device runner. Use UI Automator for system dialogs and interactions across apps. Use scrcpy for interactive mirroring when installed.

For exploration, these commands target an already selected and ready device. Discover all values from the app and the current screen.

```sh
adb -s "$SERIAL" install -r "$APK"
adb -s "$SERIAL" shell am start -W -n "$COMPONENT"
adb -s "$SERIAL" shell uiautomator dump "$REMOTE_XML"
adb -s "$SERIAL" pull "$REMOTE_XML" "$LOCAL_XML"
adb -s "$SERIAL" shell input swipe "$X1" "$Y1" "$X2" "$Y2" "$DURATION_MS"
adb -s "$SERIAL" shell input keyevent KEYCODE_BACK
adb -s "$SERIAL" logcat -d -t 200
```

Use a task-owned temporary XML path on the device. Delete that file after capture. Refresh the hierarchy or screenshot before coordinate input. Use observed bounds and verify the resulting app state. A hierarchy may omit content drawn outside the accessibility tree.

Run the Python helper from the skill directory. It passes arguments directly to adb, bounds each call, and preserves binary output.

```sh
python3 scripts/android_device.py --serial "$SERIAL" tap "$X" "$Y"
python3 scripts/android_device.py --serial "$SERIAL" capture "$ACTUAL"
```

Review [android_device.py](scripts/android_device.py) before use. Apply its serial selection and timeouts to equivalent shell commands. Wait for the expected UI state before capture. For PNG bytes, use `adb -s "$SERIAL" exec-out screencap -p`. Bound the suite's total runtime and workers.

## Compare pixels

- Keep the AVD image, resolution, density, renderer, fonts, orientation, locale, theme, system bars, and animation policy consistent. Use deterministic app data and a settled screen.
- Compare captured PNGs at their native size. Use the same crop or color conversion for both inputs when the project defines one. Record that transform.
- Use an existing project comparator first. The bundled [compare_pixels.py](scripts/compare_pixels.py) requires Python 3.10+ and Pillow in the active environment. It compares every channel of decoded 8-bit RGBA pixels, including alpha.
- Use an approved baseline and fresh output paths. The script does not overwrite captures or diffs.

```sh
python3 scripts/compare_pixels.py "$BASELINE" "$ACTUAL" --diff "$DIFF"
```

Exit `0` means an exact match. Exit `1` means pixel or size mismatch. For equal sizes, the script reports the changed pixel count and writes a black-and-white mask on mismatch. Exit `2` means an input or tooling error. Size mismatches have no pixel mask.

Use masks or tolerance only when the visual contract explicitly permits them. Use the project's comparator for those policies and report the excluded regions and thresholds. Review baseline changes with the expected, actual, and diff artifacts.

## Do not

- Send input to an unverified target. Avoid shared adb server resets, global emulator shutdown, device wipes, and app data resets during ordinary test runs.
- Circumvent protected capture or collect personal screen contents. Keep sensitive screenshots and logs out of public artifacts.
- Treat boot, install, launch, or screenshot capture as proof that a journey passed. Verify the expected outcome.

## Verify

- Record target profile, app build, scenarios, assertions, result, and artifact paths. Report unavailable targets or unexecuted scenarios.
- For screenshot comparisons, record baseline identity, image dimensions, changed pixel count, and diff path when available.
- Verify that a missing device fails and that one changed pixel fails before relying on a new regression flow.

References: [ADB](https://developer.android.com/tools/adb), [Emulator flags](https://developer.android.com/studio/run/emulator-commandline), [UI Automator](https://developer.android.com/training/testing/other-components/ui-automator), [Pillow channel operations](https://pillow.readthedocs.io/en/stable/reference/ImageChops.html).
