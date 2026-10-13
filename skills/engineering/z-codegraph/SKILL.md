---
name: z-codegraph
description: "Use an existing CodeGraph integration for call graphs, impact analysis, affected tests, or route discovery. Discover installed tools and index freshness; follow host LSP precedence and verify current source. Do not initialize indexes without user authorization."
---

# CodeGraph

Use an existing CodeGraph index when the installed integration can answer the structural question.

## Discover access

1. Find the task's repository and inspect whether it has a CodeGraph index.
2. Discover available host tools and installed CLI help. An index directory alone does not prove that a server, binary, or watcher works.
3. Follow the host's code-intelligence precedence. Use LSP for definitions, references, and implementations when that is its primary route.
4. Use CodeGraph for supported graph exploration, impact analysis, or affected-test discovery.
5. Use native text/file tools for exact searches and current-source verification.

Do not initialize an index unless the user requests or approves it. Do not activate another indexing backend automatically as a fallback.

## Query narrowly

Start with a known symbol, route, file, or question. Read the tool's current schema before calling it. Inspect returned source and graph limitations; dynamic dispatch and runtime registration may be incomplete.

If only CLI access is available, discover its supported verbs and flags with local help. Do not assume commands from another CodeGraph distribution apply.

## Check freshness

Read stale or pending files directly. Inspect status through the installed interface. Synchronize only when supported and needed within the authorized scope; do not assume a daemon is active.

For impact or affected-test output, confirm relevant callers and tests against current source before treating absence from the graph as evidence of no dependency.

## Do not

- Treat an index directory as proof of available tools or current data.
- Override host LSP routing because this skill loaded.
- Initialize a broad root, dependency cache, or unrelated repository.
- Use graph results as external library documentation.

## Verify

Report repository, access method, freshness limits, and source evidence supporting the answer. If unavailable, use the host's existing fallback rather than installing tools.
