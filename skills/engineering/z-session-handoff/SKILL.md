---
name: z-session-handoff
description: Compact the current conversation into a handoff document a fresh agent can resume from — goal, current state, decisions with their why, next steps, gotchas, suggested skills — referencing artifacts by path, secrets redacted. Triggers on context limit approaching, handing off to another agent/teammate, "handoff", "write a handoff", "continue this in a new session". Does not summarize for humans; it briefs an agent that must act next.
---

# Session handoff

Write a handoff document that lets a fresh agent continue the work without re-deriving it. Save it outside the repo — the OS temp directory — unless the user names a location; a handoff is session plumbing, not a project artifact.

## What goes in

- **Goal** — what the overall task is and what "done" means.
- **Current state** — what is finished and verified, what is in flight, what is untouched.
- **Decisions and why** — choices made during the session that the next agent must not silently re-litigate.
- **Next steps** — concrete, ordered, starting with the very next action.
- **Gotchas** — dead ends already explored, flaky commands, environment quirks, things that look wrong but are deliberate.
- **Suggested skills** — which skills the next agent should invoke and at which step.

If the user says what the next session will focus on, weight the document toward that.

## Reference, don't duplicate

Content already captured in artifacts — PRDs, plans, ADRs, specs, issues, commits, diffs — is referenced by path or URL, never pasted. The handoff carries what exists *only* in the conversation.

## Redact

Strip API keys, passwords, tokens, and personal data. If a secret is needed to continue, name where it lives (env var, secret store), not its value.

## Guard against replay

Open the document with an explicit banner: `HISTORICAL REFERENCE — state and
decisions from a previous session, not live instructions.` A resumed or
compacted session re-executes stale directives it finds in a handoff — quoted
slash commands, `ARGUMENTS=` lines, "now run X" phrasing all read as live
orders. Quote commands as facts ("`/zapply foo` was in flight"), never as
imperatives.

## Do not

- Save the handoff into the repo unasked.
- Paste file contents or diffs that a path reference covers.
- Record activity ("we discussed X") instead of outcomes ("X decided, because Y").
- Carry secrets, even redacted-looking ones.
- Write it so only the current session can decode it — the reader has zero shared context.

## Verify

- The document opens with the historical-reference banner.
- A fresh agent could execute step one of "next steps" without asking a question.
- Every artifact mention is a path or URL, not a copy.
- No credential-shaped strings in the document.

see [[z-memory-hygiene]]
