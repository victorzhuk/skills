# Verification patterns

Choose proof for the claim and the caller's scope.

1. Capture the original failure or incident evidence before editing.
2. Verify the proposed regression check detects the defect.
3. Apply the fix and run the same check.
4. Re-run the original scenario if the regression used a reduced fixture.
5. Run applicable neighboring checks through the repository wrapper.

For tests-after work, compare the finished regression against the unfixed revision in an isolated checkout when safe. Do not revert unrelated user changes to demonstrate red.

For intermittent bugs, choose a bounded repeat count and process deadline. Record every outcome and the environment. Zero failures narrows uncertainty; it does not prove the bug can never recur.

Separate local proof, staging proof, and production observation. A pending production check is a deployment follow-up, not an impossible prerequisite to deployment. Use authorized synthetic or sanitized data rather than copying production data into development.

Honor the driver's literal emitted commands and verification floor. Do not add a full-suite run, stress loop, deployment, or approval gate from this reference.

Report command, revision, outcome, limits, and unavailable checks. See the parent skill and [[z-verify-before-done]].
