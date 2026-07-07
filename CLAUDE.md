# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A public catalog of reusable `z-*` agent skills, not an application. There is no build or runtime — only skills as content plus Node scripts that list and validate them. Skills are authored in a private `~/.agents/skills` directory, copied here, and sanitized for public release (see `docs/inventory.md`).

## Commands

```bash
npm ci             # install (release.yml uses this; lockfile is package-lock.json → npm)
npm run check      # validate all SKILL.md files — this is the CI gate
npm run list       # print every skill as: name <tab> path <tab> description
npm run changeset  # record a version note (Changesets)
npm run version    # apply pending changesets to CHANGELOG + package version
```

CI (`.github/workflows/check.yml`) runs `npm run check` on Node 22 for every push to `master` and every PR, with no `npm ci` step — `check-skills.mjs` has zero external deps. `release.yml` runs `npm ci` (it needs Changesets), re-runs the check, then opens a "Version" PR via Changesets. Run `npm run check` locally before pushing any skill change.

## Layout

```
skills/<domain>/z-<name>/SKILL.md   # domain ∈ engineering | go | product | qa | rust | typescript | writing
  ├── references/   # bulk/rare detail, loaded only when the body links to it
  ├── scripts/      # deterministic code the agent runs (not reads)
  └── assets/       # templates copied into output
skills/<domain>/README.md           # per-domain index of that domain's skills
README.md                           # top-level catalog: every skill, grouped by domain
docs/inventory.md                   # provenance + public-sanitization log
```

`skills/README.md`, each domain `README.md`, and `docs/inventory.md` list skills by hand — update them when adding, renaming, or removing a skill. They are not generated.

## The validation contract (`scripts/check-skills.mjs`)

`npm run check` walks `skills/` and fails on any of these. Know them before editing a skill — a violation blocks CI:

- Every `SKILL.md` needs YAML frontmatter (`---` block) with `name` and `description`.
- `name` must match `^z-[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase, hyphen-separated, `z-` prefix), ≤ 64 chars, and be unique across the repo.
- **The skill's directory name must equal its frontmatter `name`** — renaming one means renaming both.
- `description` is required, ≤ 600 chars (house cap under the 1024 spec max), and the catalog-wide description total must stay ≤ 40,000 chars — harnesses skip skills once their budget (~50 KB) is exceeded, so the check fails before that cliff. Aim 300–450 chars per description.
- `[[z-other-skill]]` wiki-links in a body must resolve to an existing skill `name`.
- **No personal markers** anywhere under `skills/`: absolute home paths (`/home/...`, `/Users/...`), `~/.agents/references`, or `rules/commits.md`. This is the public-sanitization gate — when copying a private skill in, strip local paths and replace private references with generic or in-repo ones (`docs/inventory.md` records past substitutions).

## Authoring skills

`z-skill-mastery` (`skills/engineering/z-skill-mastery/SKILL.md`) is the canonical house-style guide — follow it when writing or refactoring any skill. Load-bearing rules:

- Frontmatter carries only `name`, `description`, and optional `allowed-tools`. No `version`, `license`, or `triggers` field — fold trigger phrases into `description`.
- `description` is the trigger the model sees before loading the skill: write it as **what it does → when to fire (one trigger phrase per branch) → boundary** (`Does not cover X; see [[other-skill]]`). Front-load a familiar "Leading Word".
- Body: plain Markdown, imperative, persona-free, under 500 lines. Prefer `## Do not` (named anti-patterns) and `## Verify` (checks) sections. Push bulk detail to `references/` only once it earns the extra hop.
- Cross-link overlapping siblings with `[[skill-name]]` rather than leaving scope implicit — this is how the `z-go-*` family disambiguates.
