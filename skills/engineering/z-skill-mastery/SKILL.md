---
name: z-skill-mastery
description: Author, refactor, and review agent skills in this repo's house style. Use when creating a new skill, editing SKILL.md frontmatter or body, deciding what belongs in the description vs the body vs references/, choosing model-invoked vs user-invoked, or auditing a skill for bloat and drift. Triggers on "write a skill", "new SKILL.md", "improve this skill", "skill description", "progressive disclosure", "does this skill trigger". Covers the writing discipline, not domain content — for a specific domain follow that domain's own z-* skill.
---

# Skill authoring

A skill is a reusable instruction set the agent loads on demand. Write it so the agent behaves the same way every time the skill fires — optimise for consistent *process*, not a pretty one-off answer.

## The one virtue: predictability

Everything below serves one goal: **predictability**. A good skill makes the agent's behaviour repeatable across sessions and phrasings. It does not guarantee identical output — it guarantees the same *approach*.

Two costs trade against each other on every decision:

- **Context Load** — tokens the skill spends. A model-invoked skill's `description` is always in context, so every word there is paid on every turn, whether or not the skill fires.
- **Cognitive Load** — what a human must remember. A user-invoked command costs no context, but the human has to know it exists and type it.

Cut Context Load until the agent misbehaves; don't add until it behaves.

## Anatomy

```
z-skill-name/
├── SKILL.md          # frontmatter + body (<500 lines)
├── references/       # detail loaded only when the body points to it
├── scripts/          # deterministic code the agent runs, not reads
└── assets/           # templates/files copied into output
```

Progressive disclosure — three levels, loaded lazily:

| Level | Loaded | Budget |
|-------|--------|--------|
| `name` + `description` | always (model-invoked) | ≤ a few lines |
| SKILL.md body | when the skill fires | < 500 lines |
| `references/`, `scripts/` | when the body sends the agent there | unbounded |

## Frontmatter

Only three fields, ever: `name`, `description`, optional `allowed-tools`. No `version`, `license`, `triggers` — fold triggers into `description` (auto-trigger reads `description` only).

```yaml
---
name: z-thing            # dir name, lowercase-hyphens, ≤64 chars, z- prefix if authored
description: What it does + when to fire + boundary. ≤1024 chars.
allowed-tools: Read Edit Bash(go:*)   # only when the skill is tool-scoped
---
```

## The description is the trigger

The `description` is the only thing the agent sees before deciding to load the skill. Write it as: **what it does → when to fire (one trigger phrase per distinct branch) → boundary**.

- Lead with the concrete verb/noun, not "This skill helps you…".
- Front-load a **Leading Word** — a pretrained concept the model already knows (`red-green-refactor`, `tracer bullet`, `ubiquitous language`, `goroutine leak`). One familiar token anchors behaviour more cheaply than a paragraph of description.
- End with a boundary: `Does not cover X; see [[other-skill]].` This is how skills in this repo disambiguate overlapping scope — see the `z-go-*` family.
- Every word is Context Load. If a phrase is already in the body, cut it from the description.

## Invocation: skill vs command

| | Model-invoked skill | User-invoked command |
|--|--|--|
| Fires when | `description` matches the task | human types `/name` |
| Context cost | description always loaded | zero until invoked |
| Home | repository `skills/**/z-*` or installed `~/.agents/skills/z-*` | the command layer (`/zreview`, `/zspec`, …) |
| Use for | knowledge the agent should reach for unprompted | multi-step flows a human deliberately starts |

Knowledge (`z-go-errors`, `z-go-testing`) is model-invoked. Orchestrated flows (`zreview`, `zaudit`, `zapply`) are commands. Claude Code also supports `disable-model-invocation: true` to keep a skill file human-only — use it if a skill must never auto-fire, but prefer the command layer for flows.

## House style

Default skeleton — plain Markdown, no XML skeleton (the `z-go-*` family is the exemplar):

```
# Title
<one-line leading instruction — what the skill makes the agent do>

## Core rules            # or topic headings; tables for quick-reference
...

## Do not                # named anti-patterns for this domain
...

## Verify                # shell commands / checks that confirm the change
...

see [[related-skill]]    # boundary + cross-links
```

Rules for the body:

- **Instruct, don't roleplay.** No `## Role`, no "You are an expert…". A skill instructs; it does not act a character. A line that only sets a persona is a No-Op.
- **Imperative + terse.** "Wrap with `%w`", not "You should consider wrapping". Match the caveman/concise house voice.
- **Motivate rules that look arbitrary.** One clause of *why* raises adherence: "return early (keeps the happy path un-nested)".
- **XML tags only for embedded verbatim blocks** the agent must reproduce (a template, a report shape) — e.g. `<prd-template>…</prd-template>`. Never as the section skeleton. See [[references/xml-patterns.md]] for the tag vocabulary when a skill genuinely orchestrates model reasoning.

## Information hierarchy

Put each fact at the shallowest level that works, and no shallower:

1. **Steps** — in the SKILL.md body. The common path.
2. **In-file Reference** — a `## Reference` section lower in the body. Detail the agent needs sometimes.
3. **External Reference** — a `references/*.md` file. Bulk detail read only when the body links to it.

Co-locate: a reference lives beside the skill that owns it. Split a body into `references/` only once it crosses ~500 lines or a section is loaded rarely — splitting sooner just adds a hop.

## Completion criterion

Give the agent a finish line it can check itself: **checkable** (the agent can tell whether it's met) and **exhaustive** (meeting it means done, with nothing implied-but-unstated).

Beware **premature completion**: listing later steps makes the agent rush the current one to reach them. Fix by sharpening the current criterion first; only split into a sequence if that fails.

## Failure modes — cut these

| Mode | What it is | Fix |
|--|--|--|
| No-Op | a line that changes nothing vs the model's default ("be thorough", "be helpful") | delete it; keep only lines that move behaviour |
| Duplication | the same instruction stated twice | state once, at the shallowest level |
| Sediment | stale instructions accreted over edits | prune on every touch |
| Sprawl | overlapping files/skills covering one thing | merge, or draw explicit boundaries with `[[links]]` |
| Over-prompting | context dumped, priorities drowned | keep the load-bearing lines only |
| Under-prompting | gaps the agent fills by guessing | state format + edge cases explicitly |
| Subjective terms | "professional", "clean", "comprehensive" | replace with a concrete spec |

Detail and before/after fixes in [[references/anti-patterns.md]].

## Writing & refactoring checklist

- [ ] `description` states what + when (one trigger phrase per branch) + boundary; ≤1024 chars; `name` ≤64.
- [ ] Body is imperative, terse, persona-free.
- [ ] Every line moves behaviour — no No-Ops, no Duplication.
- [ ] Anti-patterns named (`## Do not`) and the change is checkable (`## Verify`) where the skill produces artifacts.
- [ ] Overlap with sibling skills resolved by `[[links]]`, not left implicit.
- [ ] Detail pushed to `references/` only when it earns the hop; SKILL.md < 500 lines.
- [ ] Triggers fired against a real task phrasing.

## Quick reference

| Aspect | Rule |
|--|--|
| name | lowercase-hyphens, ≤64, `z-` prefix if authored |
| description | what + when + boundary, ≤1024, Leading Word first |
| body | plain Markdown, imperative, persona-free, `## Do not` / `## Verify` |
| cross-links | `[[skill-name]]` for boundaries and "see also" |
| XML | embedded verbatim templates only, never the skeleton |
| references/ | bulk/rare detail; co-located; link from the body |
| invocation | knowledge → model-invoked skill; flow → command |

## References

- [[references/anti-patterns.md]] — failure modes with before/after fixes.
- [[references/example-skills.md]] — house-style skills to copy from.
- [[references/reasoning-patterns.md]] — CoT/verification techniques for skills that orchestrate model reasoning (review, QA). Optional.
- [[references/xml-patterns.md]] — XML tag vocabulary for embedded templates. Optional.
