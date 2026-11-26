---
name: z-verify-before-done
description: "Verify claims about a fix, build, test, or completed requirement. Match each claim to evidence from the current revision and scope. See [[z-testing-strategy]] for test selection."
---

# Verify a completion claim

## Select evidence

| Claim | Evidence |
|---|---|
| Tests pass | The required tests ran and passed. Identify skips and missing scenarios. |
| Lint passes | The linter covered the requested files and returned success. |
| Build succeeds | The build produced the intended artifact and returned success. |
| Bug fixed | The original failure now produces the expected result. |
| Regression test works | The test fails against the defect and passes with the fix. |
| Delegated work is complete | The reviewed diff and verification evidence satisfy the assigned scope. |
| Requirements are complete | Each requirement maps to an observed result. |

## Verify the result

1. Identify the revision, inputs, environment, and scope of the claim.
2. Run the command that proves the claim. Use the exact command when the caller supplies one.
3. Read the exit status, failures, skips, and warnings. A partial run supports only its observed scope.
4. Report the evidence beside the claim. If a prerequisite is missing, identify the unverified outcome.

Reuse evidence when it covers the same revision, inputs, environment, and scope.
After a relevant change, repeat the affected command. A compatible cache hit can supply evidence under the project's cache policy.
See [[z-testing-strategy]] for test depth and [[z-systematic-debugging]] for failure investigation.
