# Engineering family gap table — skills vs real practice

Working audit doc. 6 of the 7 remaining `skills/engineering/z-*/SKILL.md`
skills audited (`z-skill-mastery`'s audit agent hit an external session rate
limit before running at all — resets 7:30pm Europe/Moscow, not attempted in
this pass). Verify stage completed for `z-memory-hygiene` and `z-codegraph`
only; `z-changelog`, `z-npm-publish`, `z-domain-modeling`, and
`z-creating-flow-doc`'s verify agents hit the same rate limit — their
audit-stage findings are single-pass but every row cites concrete file
evidence.

Two skills here don't fit the "grep Victor's application code" pattern used
everywhere else — they govern *my own behavior* (memory practices, skill
authoring), not Victor's projects. Audited against the right ground truth
instead: `z-memory-hygiene` against the live Claude Code memory mechanics
(142 real memory files across many project sessions), `z-skill-mastery`
against its own track record authoring/editing 45+ skills this session
(not yet done, see above).

## z-memory-hygiene — headline: the entire schema is fabricated

The skill's whole "Shape" template (`scope`/`category`/`importance`/`text`/
`source` fields) matches **zero** of 142 real memory files on disk. This
isn't drift from an evolved convention — it reads as generic memory-hygiene
advice invented independent of how this harness's memory actually works.

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Entry fields: `scope`, `category`, `importance` (0.1-1.0), `text`, `source` | Real frontmatter across 142 files uses only `name`/`description`/`metadata.type` (plus `node_type`, `originSessionId`). Zero `^scope:`/`^category:`/`^importance:` hits anywhere | **drift (decisive)** | replace with the real frontmatter: `name`, `description`, `metadata.type` (+ `node_type: memory`, `originSessionId`) |
| Categorization: `scope: user\|project\|repo\|org` × `category: preference\|decision\|procedure\|fact` | Real system has one enum, `type`, tallied: project 121, feedback 11, reference 9, user 1. `repo`/`org` never appear; `feedback`/`reference` — the two most load-bearing real types — are entirely unmentioned | **drift (decisive)** | replace with the real 4-value `type` enum: user, feedback, project, reference |
| (omission) No mention of a memory index file | Every real memory dir keeps a `MEMORY.md` index of one-line bulleted links — the primary discovery mechanism a future session reads first | **exceeds_skill** | add: update the `MEMORY.md` bullet when storing/updating an entry; read it at session start |
| (omission) No mention of cross-linking between entries | Real entries link pervasively with `[[entry-name]]` (mirrors this very repo's own `[[z-skill-name]]` convention) | **exceeds_skill** | add: link related entries with `[[entry-name]]`, check existing links before creating a near-duplicate |
| Body template: one-line `text:` claim; self-improvement notes as `When <trigger>, do <behavior>, because <reason>` | Real entry bodies are multi-fact prose under one topic, structured as `**Why:**`/`**How to apply:**` sections, not a single-line claim | drift | model the body template on the real Why:/How-to-apply structure; drop the strict one-claim-per-entry rule |

## z-codegraph — mostly accurate, narrow real adoption

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Gates all usage on `<repo>/.codegraph/` existing; never claims universal default | Real, active adoption in exactly 2 of 21 repos checked (`gdebenz-buddy-bot`, `olymathus/proj/api`) with fresh daemon activity dated 2026-07-01/07-02 — current, not stale. The other 19 have zero trace | no_disagreement | none — the skill's own conditional framing already matches this narrow-but-real reality |
| Auto-syncs via daemon; MCP tools (`codegraph_explore`/`codegraph_node`) are the primary access path | Both real instances show live daemon logs ("File watcher active", "Auto-synced N file(s)"). The MCP tools are genuinely wired up (confirmed live in this very session) | no_disagreement | none |
| CLI subcommands and flags (`explore`/`node`/`query`/`callers`/`callees`/`impact`/`affected`/`status`/`sync`/`init`, `-p`/`--path`, `-f`/`--force`) | Verified against the actual installed CLI (`~/.bun/bin/codegraph --help`) — every subcommand and flag matches exactly | no_disagreement | none |
| (open question) Should the 2 active repos document CodeGraph in their own CLAUDE.md/AGENTS.md? | Neither does currently — routing is driven entirely by global user rules + this skill, invisible at the project-doc layer | ambiguous | human call, not a skill defect — personal tooling choice vs. project convention worth noting for other maintainers |

## z-changelog — headline: the core "detect first" heuristic is empirically wrong

Only 6 of 21 named projects have any `CHANGELOG.md` at all
(`go-ent`, `hz-openapi-gen`, `spego`, `singularity-cli`, `v2ray-rs`,
`popoller`).

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| `cliff.toml`/goreleaser present ⇒ file is machine-generated at release time, never hand-edit it | `go-ent` has both `cliff.toml` and goreleaser's `changelog: use: git-cliff`, yet its `CHANGELOG.md` is hand-edited directly in feature commits. `cliff.toml`'s own group headings never appear in the file. `git-cliff` there only feeds the GitHub release-notes body at tag time — a separate artifact from the committed file | **drift (decisive)** | reframe: goreleaser/git-cliff generates release notes, a separate artifact from the committed CHANGELOG.md, which can (and here does) stay hand-maintained even when cliff.toml exists |
| "Two project styles" (hand-maintained, or commit-generated) presented as exhaustive | This very skills repo uses a third real style, Changesets (`.changeset/*.md` + `@changesets/cli`), entirely unmentioned | drift | add Changesets as a third detectable style with its own do/don't-hand-edit guidance |
| Release cut: run `git cliff --tag vX.Y.Z -o CHANGELOG.md`, don't hand-merge | Zero of the 6 real changelog-having repos cut releases this way; `go-ent` hand-merges Unreleased into a version heading in the same commit as the release | drift | same fix as the detection heuristic — state the hand-merge step as the real default even where cliff.toml exists |
| Keep a Changelog 1.1.0 format | 3 of 6 repos link 1.1.0; 2 link the older 1.0.0 (legacy headers, not deliberate divergence) | no_disagreement | none needed |
| Two-sentence header (format+SemVer note) + compare-link footer always present | Only 4 of 6 repos carry the full header; `hz-openapi-gen` has no SemVer sentence, `spego` has a bare `# Changelog` with neither | ambiguous | flag for a human call on softening the template's prescriptiveness — real repos trim it without anyone treating that as broken |

## z-npm-publish — confirmed accurate, real and current

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| OIDC trusted publishing (`id-token: write`), automatic signed provenance, no `NODE_AUTH_TOKEN` | Confirmed live on the npm registry — both `@zhuk/spego` and `@zhuk/singularity-cli` show `trustedPublisher.id="github"` + provenance attestations on later versions. Workflow files match the skill's template almost verbatim | no_disagreement | none — real, current practice |
| Key gotcha: OIDC/`npm trust` can't create a brand-new package, first publish must be manual | Registry history proves this exactly — v0.1.0/v0.3.2 of both packages were published by a human npm user before switching to GitHub Actions/OIDC | no_disagreement | none — this is the skill's headline gotcha and it's directly evidenced |
| Do-not: pinning an exact version string in a test snapshot breaks `npm test` on every version bump | Not hypothetical — `singularity-cli`'s CI history shows exactly this failure and the fix commit (`71bf741`) removing the pinned version from a snapshot | no_disagreement | none — extracted from a real incident |
| `package.json` shape (`@scope/pkg`, `publishConfig`, `files` gating, `bin` with shebang) | Both real packages match exactly | no_disagreement | none |
| `npm trust github <pkg> --allow-publish --repo ... --file ...` CLI syntax | The command and mechanism are real (trust relationship clearly configured for both packages); exact flag spelling not independently confirmed from docs | ambiguous (low priority) | spot-check `npm trust github --help` flag names before the next edit — mechanism is already proven real |

## z-domain-modeling — mixed: strongest and weakest claims both present

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Living glossary (`GLOSSARY.md`/`docs/domain/glossary.md`), updated on every change | Only 1 of 20 repos has any glossary (`impresario`'s `D_GLOSSARY.md`), and it's a byte-identical static appendix across two dated spec-pack snapshots — not a living, incrementally-updated file. Wrong path too | **drift (decisive)** | soften to "if you keep a glossary, update it" — real practice is a one-off appendix, not a maintained file |
| Glossary format includes an "avoid" (rejected-synonym) column | The one real glossary is a flat Term/Definition table with no avoid column anywhere | drift | remove as a required format or mark optional |
| Record boundary decisions as short ADRs (`docs/adr/NNNN-*.md`) | Only `realty-planner` has a `docs/adr/` folder, using a much heavier template than "short," and about algorithm/layering choice, not aggregate-boundary calls specifically. `olymathus` achieves the same rationale-capture via an inline decision table in a living `architecture.md` instead | aspiration/ambiguous | human call: is the ADR-file convention intended, or should the skill also recognize olymathus's lighter inline-table pattern as equally valid? |
| Repositories/transport as seams; DB/API field names never leak into domain types | The skill's best-grounded claim — verified verbatim in `bibbo` (`models.go`+`mappers.go`) and `realty-planner` (identical pattern, even prescribed in its own ADR), enforced at the tooling level in `olymathus` via a depguard allow-list | no_disagreement | none — strongest claim, keep as-is |
| Bounded contexts, aggregate invariants enforced inside the aggregate | Real and deliberate — `realty-planner`, `popoller`, `olymathus` all document this explicitly, with concrete boundary-decision rationale in `olymathus`'s architecture doc | no_disagreement | none needed |
| Deep vs. shallow module vocabulary as a review lens | The literal terms never appear anywhere (0 hits) — but this is a design heuristic, not a tracked artifact, so absence-of-phrase doesn't prove absence-of-practice. Spot-checked domain packages are substantial, consistent with the "deep module" ideal in spirit | ambiguous | keep as a design lens; soften wording so it doesn't imply teams currently "name the smell" this way |
| (omission) The skill never mentions OpenSpec | The real living-document mechanism across most of these repos for domain contracts and boundary rationale is OpenSpec (`specs/<capability>/spec.md` Requirement/Scenario; `changes/<name>/design.md` decision tables) — carrying most of what this skill asks a glossary/ADR trail to carry | ambiguous | human call: cross-link or reconcile with OpenSpec, the dominant real substrate in this codebase family |

## z-creating-flow-doc — core pattern real, one contradiction, one drift

| claim | evidence | verdict | recommendation |
|---|---|---|---|
| Core pattern: single-page, per-operation, paired-diagram behavioral-contract doc under `docs/{domain}/flows/` | Real in 2 projects: `olymathus/proj/api/docs/flows/` (43 files, exact nesting the skill describes) and `go-ent/docs/flow/` (22 files, flatter). `go-ent`'s docs predate the skill file — plausibly generalized from real usage, not written speculatively | no_disagreement | keep the core pattern as-is — verifiably real |
| Every diagram section pairs a mermaid block with a plantuml twin — "non-negotiable" | True in `go-ent` (22/22 files, strict 1:1 pairing) but flatly, deliberately overridden by `olymathus`'s own written convention doc: "Use Mermaid only" (zero plantuml in 43 files) | **ambiguous (decisive contradiction)** | soften "non-negotiable" — the skill already instructs mirroring local convention (step 2), which already covers this; reconcile explicitly rather than leaving the contradiction implicit |
| Gap-doc variant: "What's available now" / "What's missing" sections | The only real gap docs (`olymathus/docs/flows/gaps/`, 8 files) use a different shape entirely: Current Behavior → Impact → Current Flow → Recommended Fix, ending in a verification checklist | **drift (decisive)** | rewrite the gap-doc variant to match the real shape |

## z-skill-mastery — not audited this pass

The audit agent for this skill failed before producing any output (external
session rate limit, resets 7:30pm Europe/Moscow) — not attempted, not a
finding of "no disagreement." This is the meta-skill governing house style
for every skill edited in this session (45+ edits across Go, QA, and the
5 new doctrine skills); a light self-assessment from direct experience this
session: every rule (3-field frontmatter, description shape, body under 500
lines, Do-not/Verify sections, cross-link resolution) held up without
friction across all of it — but that's not an independent grep-verified
audit the way the other 6 skills got, and shouldn't be treated as equivalent
evidence.
