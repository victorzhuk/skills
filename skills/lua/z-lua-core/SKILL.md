---
name: z-lua-core
description: Lua embedded as sandboxed scripting in Go or Rust hosts — mlua for Rust, gopher-lua for Go (Lua 5.1 VM, not 5.4/5.5). 1-based indexing, nil-hazard table length, metatable-only extension, allowlisted stdlib. Triggers on Lua sandbox, gopher-lua, mlua. Does not cover host code; see [[z-go-safety]], [[z-rust-core]].
---

# Lua core

Treat every embedded Lua script as untrusted input until proven otherwise — sandbox by allowlist, budget its resources, keep the host API surface small and typed.

## Semantics that bite

- 1-based indexing — every host-side index crossing the boundary needs a +1/-1; do that conversion in one place (the binding layer), not scattered across call sites
- table length (`#t`) is undefined on a table with holes (a `nil` in the middle) — never rely on `#t` for anything but a dense array built without gaps; use an explicit counter or `table.pack`'s `n` field when holes are possible
- everything is a table — arrays, objects, and modules all reuse the same structure. Naming and doc comments are the only thing keeping "array-like" and "map-like" tables from getting confused
- metatables are the sanctioned extension point (`__index`, `__newindex`, `__call`, operator overloads) — don't stack them into a deep fake-inheritance chain; it stops being readable fast

## Embedding discipline

- sandbox by allowlist: strip `io`, `os`, `debug`, `package`/`require`, `load`/`loadstring` from any environment running untrusted or semi-trusted script content — grant back only what's proven needed, not the reverse
- instruction and memory budgets for untrusted scripts — an unbounded `while true do end` or a table grown without limit is a host-process DoS if nothing caps it (hook-based instruction counting, a memory-limit callback)
- host API surface small and typed — expose a curated set of host functions with validated argument types, not the whole host object graph
- stack discipline at the C-API-style boundary (`lua_State*` in mlua, `LState` in gopher-lua) — every push needs a matching pop/return count; an unbalanced Lua stack across a host call corrupts the calls after it

## Concurrency

- coroutines are Lua's script-side concurrency primitive — cooperative, single-threaded within one VM state. Real scheduling (goroutines, tokio tasks, thread pools) stays on the host; don't let a script coroutine block on host I/O directly

## Library choice — verified current

- Rust: `mlua` (mlua-rs/mlua) covers Lua 5.1 through 5.5 plus LuaJIT and Luau in one crate, with async/await via host coroutines
- Go: `gopher-lua` (yuin/gopher-lua) is a Lua 5.1 VM plus the 5.2 `goto` statement — not 5.4/5.5; scripts using 5.4 integer division, `<const>`, or generational-GC hooks won't run unmodified
- LuaJIT never adopted Lua 5.2's scoping changes or 5.3's integer type and stays on 5.1 semantics by design — don't assume a LuaJIT script and a PUC-Lua 5.4/5.5 script are interchangeable

## Do not

- expose the full stdlib to untrusted scripts — `os.execute`, `io.open`, `debug.getupvalue` each hand a script a host-level capability
- share mutable host state without a copy or a lock — a table built directly from a host slice/map aliases host memory; mutate-in-place bugs follow
- string-build Lua source from external input and `load()` it — that's code injection with extra steps, no different from concatenating SQL

## Verify

- host-side tests driving scripts through the real embedding API, not the interpreter standalone
- `luacheck` on script sources that live in the repo as static files
