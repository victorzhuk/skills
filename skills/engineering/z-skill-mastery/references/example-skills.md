# Skill authoring examples

## Define the trigger and the result

A skill description identifies work that a caller can recognize. The body gives the procedure and its completion check.

```markdown
---
name: z-go-errors
description: "Handle Go errors, wrap causes with %w, or inspect failures with errors.Is and errors.As. See [[z-go-observability]] for logging configuration."
---

# Handle Go errors

Wrap an error when its caller needs to inspect the cause. Use a short operation name for context.

## Choose the error contract

- Return a sentinel when callers need to recognize a condition.
- Return a typed error when callers also need structured details.
- Log a failure where it is handled. Avoid duplicate logs when returning an error to the caller.

## Verify

Exercise the failure through its public caller. Check that the caller can distinguish the documented error.
```

The example names specific Go operations and gives an observable result. See [[z-go-errors]] for the maintained guidance.

## Replace a persona with an instruction

“Act as an experienced Rust engineer” leaves the action unspecified.
“Identify who owns the value after each call” gives the reader a decision to check.

## Select the entry point

Use a skill when the task should select reusable domain knowledge.
Use a command when the user deliberately starts an ordered workflow.
Keep dispatch, process control, and permissions in the calling host.
