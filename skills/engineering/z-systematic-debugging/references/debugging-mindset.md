# Debugging bias checks

Use these checks when progress stalls.

| Bias | Observable warning | Next action |
|---|---|---|
| Confirmation | Only collecting evidence for the first explanation | Design a probe that could refute it |
| Anchoring | Treating an error message as its root cause | Trace the operation that produced the error |
| Familiarity | Assuming code is correct because you wrote it | Compare actual values and control flow with the contract |
| Availability | Reusing the last incident's explanation | Check whether its distinguishing evidence exists |
| Sunk cost | Repeating probes that cannot change the conclusion | Record what is known and choose a different discriminator |

Reassess after repeated failed fixes or a probe that produces no new information. Preserve the working tree and evidence. Do not close user terminals, discard work, or reset the session.

Report observations and concise rationale. Internal reasoning need not be printed as an audit trail.
