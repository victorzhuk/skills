# Diagnosis protocol

Use when the initial investigation has stalled. This reference supplies techniques; the caller retains task scope, authorization, process lifecycle, and result delivery.

## Evidence record

Record the exact symptom, expected outcome, first known failure, affected environment, and current reproduction or observation method. Separate observations from interpretations.

Trace the path from input to failure. Read the relevant callers, state changes, configuration, and dependency behavior. Prioritize recently changed code without assuming it must be guilty.

## Investigation

1. List plausible causes and the evidence for each.
2. Choose a probe that separates competing explanations.
3. Run it within the caller's permitted scope and resource limits.
4. Record observed output, eliminated hypotheses, and remaining uncertainty.
5. Update the next probe from the result rather than repeating a disproven approach.

A local reproduction is preferable but may be unavailable for an incident. Use traces or other authorized evidence and report the limits of causal confidence.

## Result

Report evidence, supported cause, smallest repair, and verification required. If implementation is authorized, continue through the parent skill's fix loop. If the task is diagnosis-only, deliver the findings. Do not introduce another approval gate.

See [hypothesis testing](hypothesis-testing.md), [investigation techniques](investigation-techniques.md), and [verification patterns](verification-patterns.md).
