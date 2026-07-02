---
name: z-codegraph
description: "Use when working with CodeGraph code intelligence: symbol search, call graph exploration, impact analysis, affected tests, route-to-handler lookup, or codebase understanding in repositories that already have a .codegraph/ index. Prefer this over grep/read for structural code questions when .codegraph/ exists; do not initialize indexes unless the user asks or approves."
---

# CodeGraph

Use CodeGraph as the primary local code-intelligence layer for repositories that already contain a `.codegraph/` directory.

## Routing

1. Find the repository root for the task.
2. If `<repo>/.codegraph/` exists, use CodeGraph before `rg`, `fd`, or file reads for structural code questions.
3. If `.codegraph/` is absent, skip CodeGraph. Do not run `codegraph init` unless the user explicitly asks or approves indexing that repo.
4. Use exact tools (`rg`, `fd`, `read`) for literal searches and final verification.
5. Use CocoIndex/`ccc` only as a semantic-search fallback when CodeGraph is unavailable, insufficient, or the user asks for CocoIndex.

## Best uses

Use CodeGraph for:

- "How does X work?" architecture and flow questions.
- Symbol, class, function, handler, and route discovery.
- Caller/callee traversal and dynamic-dispatch-aware call paths.
- Impact analysis before changing a symbol.
- Finding affected tests for changed files.
- Reading current source for a known symbol or file through the graph.

Do not use CodeGraph for:

- Repositories without `.codegraph/`, unless the user approves initialization.
- Exact text searches where `rg` is simpler.
- Documentation/library API lookup outside the current repo.

## Access

Prefer MCP tools when available:

- `codegraph_explore` — answers most code questions with relevant source and call paths.
- `codegraph_node` — loads one symbol or file with caller/callee context.

Shell equivalents always work:

```bash
codegraph explore -p <repo> "<question or symbols>"
codegraph node -p <repo> <symbol-or-file>
codegraph query -p <repo> "<symbol search>"
codegraph callers -p <repo> <symbol>
codegraph callees -p <repo> <symbol>
codegraph impact -p <repo> <symbol>
codegraph affected -p <repo> <changed-files...>
codegraph status <repo>
```

## Freshness

CodeGraph normally auto-syncs through its daemon. If output reports pending or stale files:

1. Read those files directly for live content.
2. Run `codegraph status <repo>` to inspect sync state.
3. Run `codegraph sync <repo>` only when the watcher is unavailable or a script needs an explicit pre-flight sync.

## Initialization safety

Do not initialize broad or ambiguous roots such as `$HOME`, filesystem roots, dependency caches, or large monorepos without user approval. If initialization is approved, run:

```bash
codegraph init <repo>
```

Then verify:

```bash
codegraph status <repo>
```
