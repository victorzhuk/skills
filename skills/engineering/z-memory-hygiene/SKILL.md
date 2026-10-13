---
name: z-memory-hygiene
description: Store, update, and review durable memory using the active host's supported backend and scope. Use for remembered preferences, corrections, project decisions, or recall checks. Avoid duplicate and stale entries. Transient session state belongs to [[z-session-handoff]].
---

# Memory hygiene

Store durable, useful facts through the active host's supported memory system.

## Discover the storage contract

Inspect available memory tools, host instructions, and existing project conventions. Determine scope, storage location, entry format, retrieval behavior, and whether saving is authorized.

Do not replace a native backend with files merely because this skill describes a file pattern. Do not assume `MEMORY.md` is automatically loaded or that a particular taxonomy is required.

## Select content

- Keep durable preferences, corrections, ongoing project decisions, and stable reference pointers.
- Distinguish user facts from inferred preferences.
- Record the source, relevant scope, and uncertainty when useful.
- Store the reason and application trigger for behavioral feedback.
- Keep transient run state in a handoff or task record.

Use host-supported types. Where a file-based convention already uses user, feedback, project, and reference categories, preserve those categories.

## Update without duplication

Retrieve related entries before saving. Update the existing topic when its meaning changes; link related topics instead of copying them.

For a host that uses entry files plus an index, keep one focused entry per topic and a short index pointer. Match its existing frontmatter and link syntax. This is a conditional convention, not a new backend to install.

## Do not

- Store secrets, raw logs, sensitive personal data, or unverified guesses.
- Preserve stale task status as a durable fact.
- Copy facts already maintained authoritatively in the repository without a retrieval reason.
- Turn praise or blame into memory; record an observable trigger and action.
- Assume a successful write proves the next session can retrieve it.

## Verify

Use the supported recall path with words a future task would use. Confirm the saved entry has the intended scope and supersedes obsolete content. Report storage or recall limitations.

See [[z-session-handoff]].
