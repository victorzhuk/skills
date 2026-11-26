---
name: z-changelog
description: "Maintain CHANGELOG.md, add a changeset, or prepare release notes. Identify whether the project uses Keep a Changelog, Changesets, or git-cliff before editing."
---

# Changelog upkeep (Keep a Changelog 1.1.0)

## Identify who writes CHANGELOG.md

- **Hand-maintained file.** Add the user-visible change under `[Unreleased]`.
- **Changesets.** If the release workflow consumes changesets, add `.changeset/<name>.md`. Set the package bump and describe the change.
- **git-cliff or GoReleaser.** Inspect the release command's output path. It can publish release notes without writing the repository's changelog.
- If a command writes `CHANGELOG.md`, follow its input convention. Preserve a hand-maintained file when the generator writes elsewhere.

## The six change types

Use these headings for populated sections.

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

Place `[Unreleased]` above version headings. List releases newest first as `## [X.Y.Z] - YYYY-MM-DD`.
Keep comparison links at the end. Mark a withdrawn release `[YANKED]` and preserve its entry.

## Writing good entries

- One line per change, describing the user-visible effect.
- Good: `Added: webhook retries with exponential backoff.`
- Bad: `fix(api): handle nil in handler (a1b2c3d)` — that's a commit, not a
  changelog line.
- Notability test: would a user or integrator care on upgrade? If not (internal
  refactor, test, formatting, chore/ci/build), leave it out.

## Release cut

1. **Hand-maintained.** Move the unreleased entries to the dated version heading. Add an empty `[Unreleased]` heading above it.
   Link the new version to the preceding tag. Update `[unreleased]` to compare the new tag with `HEAD`.
2. **Changesets**: run the project's version step (commonly `npm run
   version` / `pnpm changeset version` / `changeset version`) — it consumes
   pending `.changeset/*.md` files, bumps the version, and writes
   `CHANGELOG.md`. Don't hand-merge `[Unreleased]`.
3. **git-cliff/goreleaser confirmed writing `CHANGELOG.md`** (per the
   detection rule above): run that documented command instead of
   hand-merging.

Use the actual release date in ISO 8601 format.

## Init a new changelog

Use the structure above with an empty `## [Unreleased]` and no version entries
yet. Follow the project's location convention. Use a local scaffold command only when the project supplies one.
