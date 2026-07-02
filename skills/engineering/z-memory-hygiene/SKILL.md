---
name: z-memory-hygiene
description: Use when storing, updating, or reviewing long-term agent memory. Covers the four memory types (user/feedback/project/reference), the two-file save shape, the MEMORY.md index, cross-linking, and verification by recall.
---

# Memory Hygiene

Store only durable, useful facts. Memory is for future sessions, not scratch space.

## Type, not scope×category

Classify every entry into exactly one type — not a scope/category matrix:

- **user** — who the user is, their role, expertise, working style.
- **feedback** — a correction or confirmation about how to approach work; the most common type in practice.
- **project** — in-flight work state: who's doing what, why, current epic/task status.
- **reference** — a stable fact about how something works, or a pointer to an external system.

## Shape — two files, not one

Saving is a two-step write, not a single entry:

**Step 1** — the entry itself, its own file, with minimal frontmatter:

```text
---
name: {{short-kebab-case-slug}}
description: {{one-line summary — used to judge relevance later}}
metadata:
  type: {{user, feedback, project, reference}}
---

{{content}}
```

For `feedback`/`project` entries, structure the body as the rule/fact itself,
then a `**Why:**` line and a `**How to apply:**` line — this is what makes
the entry usable months later instead of a bare, unqualified statement.

**Step 2** — a pointer in `MEMORY.md`, the index: one line, under ~150 chars,
`- [Title](file.md) — one-line hook`. `MEMORY.md` is always loaded into
context — it is an index, never memory content directly.

Rules:

- One entry per topic, not one entry per sentence — bundle related facts under one named file rather than fragmenting.
- Link related entries with `[[entry-name]]` instead of duplicating their content; check existing links and `MEMORY.md` before creating a near-duplicate.
- Mark uncertainty explicitly or do not store.
- Keep the index terse — content belongs in the entry file, not in `MEMORY.md`.

## Do not

- Invent a scope/category taxonomy — use the four real types (user, feedback, project, reference).
- Write memory content directly into `MEMORY.md` — it's a pointer index only.
- Store one-off task state, secrets/tokens, raw logs, unverified guesses, sensitive personal data, or facts already obvious from committed repo files.
- Store praise, blame, or vague lessons like "be more careful" — convert to an observable trigger and action instead.

## Verify

After storing important memory, recall it once with the words a future agent would use. If recall fails, rewrite the entry with clearer terms, and confirm its `MEMORY.md` line still points to it.

Before overwriting or forgetting memory, recall related entries and check `MEMORY.md` first — update the existing entry when the meaning is the same rather than duplicating it.
