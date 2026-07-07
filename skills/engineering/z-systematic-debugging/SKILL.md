---
name: z-systematic-debugging
description: Root-cause-first debugging loop — no fixes before a feedback loop exists and the cause is understood. Build a tight red-capable repro, minimize it, rank falsifiable hypotheses, instrument one variable at a time, fix at the source. Use for any bug, test failure, or unexpected behavior — especially under time pressure or after a fix that didn't work. Triggers on "debug this", "diagnose", "why is this failing". Does not cover Go tooling (pprof, dlv, race detector); see [[z-go-troubleshooting]].
---

# Systematic debugging

No fixes without root-cause investigation first. Symptom patches waste time and create new bugs; the process below is faster than guess-and-check thrashing, especially when it feels too slow to afford.

## Phase 1 — Build a feedback loop

**This is the skill; everything after is mechanical.** A tight pass/fail signal that goes red on *this* bug makes bisection, hypotheses, and instrumentation work; without one, no amount of reading code will save you. Spend disproportionate effort here.

Ways to construct one, in rough order: failing test at whatever seam reaches the bug → curl/HTTP script against a dev server → CLI run with a fixture, diffed against known-good output → headless browser script → replay a captured trace through the code path in isolation → throwaway harness (minimal system subset, one function call) → property/fuzz loop for "sometimes wrong" bugs → bisection harness (`git bisect run`) when the bug appeared between two known states → differential run (old vs new version, diff outputs).

Then tighten it: faster (cache setup, narrow scope), sharper (assert the exact symptom, not "didn't crash"), more deterministic (pin time, seed RNG, isolate filesystem).

Non-deterministic bugs: aim for a higher reproduction rate, not a clean repro — loop the trigger 100×, add stress, narrow timing windows. A 50% flake is debuggable; 1% is not.

**Can't build a loop? Stop and say so.** List what you tried; ask for environment access, a captured artifact (HAR, log dump, core dump), or permission to add temporary instrumentation. Do not hypothesize without a loop.

Done when one command — already run at least once, output in hand — is red-capable (asserts the user's exact symptom), deterministic, fast (seconds), and agent-runnable.

## Phase 2 — Reproduce and minimize

Run the loop; watch it go red on the failure mode the *user* described — a nearby different failure means the wrong bug and the wrong fix. Also read the error output completely (message, stack, line numbers) and check what changed recently (`git diff`, new deps, config) — often the answer is already there.

Then shrink the repro to the smallest scenario that still goes red: cut inputs, callers, config, and steps one at a time, re-running after each cut. Done when every remaining element is load-bearing. A minimal repro shrinks the hypothesis space and becomes the regression test.

## Phase 3 — Hypothesize

Generate **3–5 ranked hypotheses** before testing any — a single hypothesis anchors on the first plausible idea. Compare against working examples of the same pattern in the codebase; list every difference, however small.

Each hypothesis must be falsifiable: "if X is the cause, changing Y makes the bug disappear". Can't state the prediction — it's a vibe; discard or sharpen.

Show the ranked list to the user before testing: they often re-rank instantly ("we just deployed #3") or have already ruled some out. Don't block on it if they're away.

## Phase 4 — Instrument

Each probe maps to one prediction; change one variable at a time. Prefer a debugger/REPL breakpoint over logs; targeted logs at hypothesis-distinguishing boundaries over that; never "log everything and grep". Tag every debug log with a unique prefix (e.g. `[DEBUG-a4f2]`) so cleanup is one grep.

Performance regressions: logs are usually wrong — establish a baseline measurement first (timing harness, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix and lock

Write the regression test **before the fix**, at a seam that exercises the real bug pattern ([[z-tdd]]). If the only available seam is too shallow to replicate the trigger, **the missing seam is itself a finding** — record it instead of writing a false-confidence test.

Then: watch the test fail → apply one fix at the root cause (no bundled refactoring, no "while I'm here") → watch it pass → re-run the Phase 1 loop against the original, un-minimized scenario.

**Three failed fixes means the architecture is the problem.** If each fix reveals new coupling somewhere else, stop fixing and question the pattern with the user — that is not a failed hypothesis, it's a wrong design.

## Phase 6 — Clean up

- Original repro no longer reproduces (re-run the loop).
- Regression test in place, or the missing seam documented.
- All tagged instrumentation removed (grep the prefix); throwaway harnesses deleted.
- The confirmed hypothesis stated in the commit message — the next debugger learns.
- Ask what would have prevented this bug; make architectural recommendations *after* the fix is in, when you know the most.

## Do not

- Propose a fix before Phase 1 produces a red-capable command.
- Try "quick fix now, investigate later" — the first fix sets the pattern.
- Test two hypotheses (or apply two changes) at once — you can't isolate what worked.
- Skip the process because the bug "is simple" or it's an emergency — simple bugs have root causes too, and systematic is faster than thrashing.
- Attempt a fourth fix after three failures without an architecture conversation.
- Claim fixed without re-running the original repro; see [[z-verify-before-done]].

## Verify

- The feedback-loop command and its red output are pasted in the conversation before any hypothesis.
- The fix commit names the confirmed root cause.
- Loop green on the original scenario; full test suite unbroken; no `[DEBUG-` markers left (`rg '\[DEBUG-'`).

see [[z-go-troubleshooting]], [[z-tdd]], [[z-verify-before-done]]
