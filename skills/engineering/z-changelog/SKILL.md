---
name: z-changelog
description: Maintain a Keep a Changelog 1.1.0 CHANGELOG.md — [Unreleased] upkeep, the six change types, the release cut, YANKED, the SemVer note, and the three real project styles (hand-maintained, Changesets, git-cliff/goreleaser) and how they coexist. Use when writing changelog entries, scaffolding a CHANGELOG.md, cutting a release, or asked about "changelog", "release notes", "[Unreleased]", or "changeset". Triggers on "CHANGELOG.md", "keep a changelog", "release notes", "changelog entry", "changeset". Does not cover commit message format.
allowed-tools: Read Edit Write Bash(git:*) Bash(git-cliff:*) Bash(date:*)
---

# Changelog upkeep (Keep a Changelog 1.1.0)

A changelog is a curated, chronological list of notable changes, written for
**humans, not machines**. Never dump a git log into it.

## Three project styles — detect first

- **Hand-maintained** — a plain `CHANGELOG.md`, no generator wired to write
  it. Edit `## [Unreleased]` directly as work lands. This is the default even
  in repos that also carry `cliff.toml` or a goreleaser `changelog:` block —
  see below.
- **Changesets** — a `.changeset/` dir plus `@changesets/cli` in
  `package.json`. Add a per-PR changeset file instead of touching
  `CHANGELOG.md`: `.changeset/<name>.md` with a bump-type frontmatter block
  (`"pkg-name": patch|minor|major`) and a prose body describing the
  user-facing change. At release time, `changeset version` (often wired as a
  `version` script) consumes every pending changeset file, bumps the package
  version, and writes the entries into `CHANGELOG.md` itself. Don't hand-edit
  `CHANGELOG.md` in this flow — add a changeset instead.
- **git-cliff/goreleaser present** — `cliff.toml` or a `.goreleaser.y(a)ml`
  `changelog:` block by itself only configures a *release-notes* generator:
  by default it populates the GitHub release body at tag time, a separate
  artifact from the committed `CHANGELOG.md`. Presence alone does not make
  the committed file machine-generated — a project can ship both `cliff.toml`
  and `changelog: use: git-cliff` and still hand-edit `CHANGELOG.md` directly
  in feature commits, because cliff's default commit-group headings
  (`Features`, `Bug Fixes`, `Refactor`, …) rarely match the project's own Keep
  a Changelog headings (`Added`, `Changed`, `Fixed`, plus whatever custom ones
  it has settled on). Only treat `CHANGELOG.md` itself as machine-generated
  when a Makefile/CI target actually writes to it — look for `git cliff ...
  -o CHANGELOG.md` / `--output CHANGELOG.md` (or an equivalent goreleaser
  publish step) in the project's own scripts, not just the config file's
  presence.

## Do not

- Don't conclude "machine-generated, never hand-edit" from `cliff.toml` or a
  goreleaser `changelog:` block alone — see the detection rule under
  "git-cliff/goreleaser present" above.
- Don't hand-edit `CHANGELOG.md` directly in a Changesets project — add a
  `.changeset/*.md` file and let `changeset version` write the entry.

## The six change types

Group entries under these `###` headings; include only the ones with entries:

| Heading | Use for |
|---|---|
| `Added` | new features |
| `Changed` | changes to existing behavior |
| `Deprecated` | features slated for removal |
| `Removed` | features now removed |
| `Fixed` | bug fixes |
| `Security` | vulnerabilities and their fixes |

## File structure

```markdown
# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-01-15

### Added
- Webhook retries with exponential backoff.

### Fixed
- Crash when the config file was empty.

[unreleased]: https://github.com/OWNER/REPO/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/OWNER/REPO/compare/v1.1.0...v1.2.0
```

`## [Unreleased]` always sits on top; versions are `## [X.Y.Z] - YYYY-MM-DD`
(ISO 8601), latest first; compare links are reference-style definitions at the
bottom. A pulled release stays in the file, tagged
`## [X.Y.Z] - YYYY-MM-DD [YANKED]`.

## Writing good entries

- One line per change, describing the user-visible effect.
- Good: `Added: webhook retries with exponential backoff.`
- Bad: `fix(api): handle nil in handler (a1b2c3d)` — that's a commit, not a
  changelog line.
- Notability test: would a user or integrator care on upgrade? If not (internal
  refactor, test, formatting, chore/ci/build), leave it out.

## Release cut

1. **Hand-maintained** (default — also covers most git-cliff/goreleaser repos
   that don't write `CHANGELOG.md` directly): rename `## [Unreleased]` →
   `## [X.Y.Z] - YYYY-MM-DD`, add a fresh empty `## [Unreleased]` above it, and
   update the compare links (`[unreleased]` → `vX.Y.Z...HEAD`; add `[X.Y.Z]` →
   `vPREV...vX.Y.Z`).
2. **Changesets**: run the project's version step (commonly `npm run
   version` / `pnpm changeset version` / `changeset version`) — it consumes
   pending `.changeset/*.md` files, bumps the version, and writes
   `CHANGELOG.md`. Don't hand-merge `[Unreleased]`.
3. **git-cliff/goreleaser confirmed writing `CHANGELOG.md`** (per the
   detection rule above): run that documented command instead of
   hand-merging.

Use today's date (`date +%F`); confirm it rather than guessing.

## Init a new changelog

Use the structure above with an empty `## [Unreleased]` and no version entries
yet. Name it `CHANGELOG.md` at the repo root. `/changelog init` scaffolds this.
