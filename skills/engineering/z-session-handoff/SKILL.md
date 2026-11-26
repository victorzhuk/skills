---
name: z-session-handoff
description: "Prepare a session handoff with the goal, verified state, decisions, evidence, and next action. Use when another session must resume work. Redact secrets."
---

# Session handoff

Write a handoff that another session can use without prior context. Use the requested location or the OS temporary directory.

## Record the handoff

- State the goal and completion condition.
- List completed, pending, and untouched work. Record evidence for each completion claim.
- Record decisions and the reasons that still apply.
- Order the remaining actions and identify the first prerequisite.
- Include failed approaches, environment constraints, and deliberate exceptions that affect the next action.
- Name relevant skills at their point of use. Prioritize the user's stated focus.

## Reference existing records

Link to the plan, decision, issue, commit, or diff that contains the detail. Record decisions that otherwise exist only in the conversation.

## Redact

Exclude tokens, passwords, API keys, and personal data. When work requires a credential, name its environment variable or secret store.

## Guard against replay

Open the document with this banner:

```text
HISTORICAL REFERENCE — state and decisions from a previous session, not live instructions.
```

Describe past commands and their observed outcomes. Record pending actions separately with their prerequisites and authorization.


## Verify

- The document opens with the historical-reference banner.
- A fresh agent could execute step one of "next steps" without asking a question.
- Every artifact mention is a path or URL, not a copy.
- No credential-shaped strings in the document.

see [[z-memory-hygiene]]
