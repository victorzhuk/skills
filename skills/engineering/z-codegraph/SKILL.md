---
name: z-codegraph
description: "Query an existing CodeGraph index for callers, affected tests, routes, or change impact. Check index coverage and freshness against current source."
---

# Query CodeGraph

## Locate the index

Identify the repository, available integration, and index root. Check CLI commands with installed help or inspect the host tool schema.
Follow the host's code-intelligence precedence. Use LSP for definitions, references, and implementations when that is the primary route.
Initialize an index only with the user’s authorization. When graph access fails, use the existing file search.

## Answer a structural question

1. Start with a known symbol, route, or file. Query callers, dependencies, or affected tests as needed.
2. Inspect index status and pending files. Synchronize only when supported and authorized for the selected root.
3. Compare graph results with current source. Dynamic dispatch and runtime registration can hide edges.
4. Read changed files directly. For an absent edge, identify what source or runtime evidence supports that conclusion.

## Check the answer

Report the repository, access method, relevant code locations, and freshness limits.
Use library documentation for external APIs. A local index describes only its indexed source.
